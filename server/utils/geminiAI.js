const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI
// Note: User should provide GEMINI_API_KEY in .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Intelligent Grievance Analysis
 * Uses Gemini to classify, assess priority, detect sentiment, analyze images, and translate.
 */
async function analyzeGrievance(title, description, images = []) {
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
        "suggestedDepartment": "Department Name",
        "confidence": 85,
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
    return JSON.parse(jsonStr);

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
    suggestedDepartment: classification.suggestedDepartment,
    confidence: classification.confidence,
    alternatives: classification.alternatives,
    priority: priority,
    sentiment: 'neutral',
    isUrgent: priority === 'high',
    detectedLanguage: 'English',
    summary: classification.summary,
    keyEntities: []
  };
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
