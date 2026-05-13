const { GoogleGenerativeAI } = require("@google/generative-ai");
const { evaluateComplaintTextQuality } = require('../services/ai/inputQuality');

// Initialize Gemini AI
// Note: User should provide GEMINI_API_KEY in .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Intelligent Grievance Analysis
 * Uses Gemini to classify, assess priority, detect sentiment, analyze images, and translate.
 */
async function analyzeGrievance(title, description, images = []) {
  const combinedText = `${title || ''} ${description || ''}`.trim();
  const inputQuality = evaluateComplaintTextQuality(combinedText);

  if (!inputQuality.isMeaningful) {
    return manualReviewAnalysis(title, description, inputQuality);
  }

  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY missing. Falling back to keyword analysis.");
    return fallbackAnalysis(title, description);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prepare content array for multi-modal analysis
    const contents = [];
    
    let prompt = `
      You are an AI assistant for a government grievance portal. 
      Analyze the following complaint (which may be in any language) and return a JSON object.

      Complaint Title: "${title}"
      Complaint Description: "${description}"

      If images are provided, analyze them to verify if they match the description.

      Return ONLY valid JSON in this exact format:
      {
        "category": "Electricity/Water Supply/Sanitation & Waste/Public Infrastructure/Public Safety/Other",
        "suggestedDepartment": "Department Name",
        "confidence": 85,
        "confidenceBand": "Low/Medium/High",
        "requiresHumanReview": false,
        "alternatives": [{"department": "Dept", "confidence": 10}],
        "priority": "high/medium/low",
        "sentiment": "neutral/urgent/etc",
        "isUrgent": true/false,
        "detectedLanguage": "Hindi/English/etc",
        "translatedTitle": "English Title",
        "translatedDescription": "English Description",
        "summary": "English summary",
        "verification": {
          "status": "verified/unverified/suspicious",
          "reason": "Why...",
          "confidence": 90
        }
      }
    `;

    contents.push({ text: prompt });

    // Add images if provided
    for (const img of images) {
      if (img.inlineData) {
        contents.push({ inlineData: img.inlineData });
      }
    }

    const result = await model.generateContent(contents);
    const response = await result.response;
    const text = response.text();
    
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return normalizeAnalysisResult(JSON.parse(jsonStr), title, description, inputQuality);

  } catch (error) {
    console.error("AI Analysis Error:", error);
    return fallbackAnalysis(title, description);
  }
}

/**
 * Fallback to basic logic if API fails or key is missing
 */
function fallbackAnalysis(title, description) {
  const { classifyGrievance, classifyPriority } = require('./aiClassifier');
  const classification = classifyGrievance(title, description);
  const priority = classifyPriority(title, description);

  return {
    category: classification.category,
    suggestedDepartment: classification.suggestedDepartment,
    confidence: classification.confidence,
    confidenceBand: classification.confidenceBand,
    requiresHumanReview: classification.requiresHumanReview,
    alternatives: classification.alternatives,
    priority: priority,
    sentiment: 'neutral',
    isUrgent: priority === 'high',
    detectedLanguage: 'English',
    message: classification.message,
    inputQuality: classification.inputQuality,
    summary: classification.summary,
    keyEntities: []
  };
}

function normalizeAnalysisResult(result, title, description, inputQuality) {
  const normalizedConfidence = normalizeConfidencePercent(result.confidence);

  if (!inputQuality.isMeaningful || normalizedConfidence < 40 || inputQuality.civicKeywordCount === 0) {
    return manualReviewAnalysis(title, description, inputQuality, normalizedConfidence);
  }

  const confidenceBand = normalizedConfidence < 65 ? 'Medium' : 'High';
  const requiresHumanReview = normalizedConfidence < 65;
  const suggestedDepartment = result.suggestedDepartment || mapCategoryToDepartment(result.category);

  return {
    ...result,
    category: normalizeCategory(result.category || mapDepartmentToCategory(suggestedDepartment)),
    suggestedDepartment,
    confidence: normalizedConfidence,
    confidenceBand,
    requiresHumanReview,
    alternatives: requiresHumanReview ? filterAlternatives(result.alternatives) : (result.alternatives || []),
    message: requiresHumanReview
      ? 'This complaint may need human review before final routing.'
      : (result.message || ''),
    inputQuality
  };
}

function manualReviewAnalysis(title, description, inputQuality, confidence = 20) {
  const safeConfidence = Math.max(0, Math.min(normalizeConfidencePercent(confidence), 39));

  return {
    category: 'Other',
    suggestedDepartment: 'Manual Review Desk',
    confidence: safeConfidence,
    confidenceBand: 'Low',
    requiresHumanReview: true,
    alternatives: [],
    priority: 'low',
    sentiment: 'neutral',
    isUrgent: false,
    detectedLanguage: 'Not enough text',
    translatedTitle: title || '',
    translatedDescription: description || '',
    summary: 'Complaint needs clearer civic details before accurate routing.',
    message: 'Please add more details for accurate classification.',
    inputQuality,
    keyEntities: []
  };
}

function normalizeConfidencePercent(confidence) {
  const number = Number(confidence);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number <= 1 ? number * 100 : number);
}

function normalizeCategory(category) {
  if (category === 'Roads') return 'Public Infrastructure';
  if (category === 'Sanitation') return 'Sanitation & Waste';
  return category || 'Other';
}

function mapDepartmentToCategory(department) {
  return ({
    'Public Works': 'Public Infrastructure',
    'Public Works Department': 'Public Infrastructure',
    Sanitation: 'Sanitation & Waste',
    'Sanitation Department': 'Sanitation & Waste',
    'Water Authority': 'Water Supply',
    'Water Supply Department': 'Water Supply',
    'Electricity Board': 'Electricity',
    'Electricity Department': 'Electricity',
    'Municipal Safety': 'Public Safety',
    'Emergency Response Cell': 'Public Safety',
    'Manual Review Desk': 'Other'
  })[department] || 'Other';
}

function mapCategoryToDepartment(category) {
  return ({
    'Public Infrastructure': 'Public Works',
    Roads: 'Public Works',
    'Sanitation & Waste': 'Sanitation',
    Sanitation: 'Sanitation',
    'Water Supply': 'Water Authority',
    Electricity: 'Electricity Board',
    'Public Safety': 'Municipal Safety',
    Other: 'Manual Review Desk'
  })[category] || 'Manual Review Desk';
}

function filterAlternatives(alternatives = []) {
  return alternatives.filter(alt => normalizeConfidencePercent(alt.confidence) >= 40);
}

/**
 * Generate a professional response for an official
 */
async function generateOfficialResponse(grievance, context) {
  if (!process.env.GEMINI_API_KEY) {
    return "Thank you for your report. We have received your grievance and are looking into it.";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      You are an AI assistant for a government official. 
      Generate a professional, empathetic response to the following grievance.
      
      Grievance Title: "${grievance.title}"
      Description: "${grievance.description}"
      Current Status: "${grievance.status}"
      Official Note/Context: "${context || ''}"
      
      The response should:
      1. Acknowledge the issue.
      2. State what action is being taken (based on context).
      3. Provide a polite closing.
      
      Return ONLY the text of the response.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Response Generation Error:", error);
    return "We have received your grievance and our team is working on a resolution.";
  }
}

module.exports = { analyzeGrievance, generateOfficialResponse };
