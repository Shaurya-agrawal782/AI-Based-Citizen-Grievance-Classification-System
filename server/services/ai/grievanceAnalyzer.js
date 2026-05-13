const { detectLanguage } = require('./languageDetector');
const { classifyComplaint } = require('./classifierEngine');
const { calculateUrgency } = require('./urgencyEngine');
const { routeComplaint } = require('./routingEngine');
const { detectDuplicatePlaceholder } = require('./duplicateEngine');
const { generateExplanation } = require('./explanationEngine');
const { calculateConfidence } = require('./confidenceEngine');
const { maskPII } = require('../privacy/piiMasker');

/**
 * Orchestrates the full AI intelligence pipeline for a grievance.
 * @param {Object} input - The input object {title, description, location, locationContext, existingComplaints}.
 * @returns {Object} - The structured JSON object with all analysis results.
 */
const analyzeGrievanceIntelligently = async (input) => {
  try {
    const { title = "", description = "", location = "", locationContext = "", existingComplaints = [] } = input;
    const combinedText = `${title} ${description}`.trim();
    const processedAt = new Date();

    // 0. Mask PII before any AI processing
    const privacyResult = maskPII(combinedText);
    const maskedProcessingText = privacyResult.maskedText;

    // 1. Detect language and translate if needed
    const languageResult = await detectLanguage(maskedProcessingText);
    const processingText = languageResult.translatedText || maskedProcessingText;

    // 2. Classify the complaint
    const classification = await classifyComplaint(processingText);

    // 3. Detect duplicates
    const duplicateCheck = await detectDuplicatePlaceholder({
      text: processingText,
      category: classification.category,
      location,
      priority: 'Normal', // Evaluated after duplicates, so default provided here
      existingComplaints
    });

    // 4. Calculate urgency and SLA
    const urgencyResult = await calculateUrgency({
      text: processingText,
      category: classification.category,
      locationContext,
      duplicateCheck
    });

    // Calculate SLA Deadline
    let slaDeadline = null;
    let slaStatus = null;
    if (typeof urgencyResult.slaHours === 'number') {
      slaDeadline = new Date(processedAt.getTime() + urgencyResult.slaHours * 60 * 60 * 1000).toISOString();
      slaStatus = "On Track";
    }

    const sla = {
      hours: urgencyResult.slaHours,
      deadline: slaDeadline,
      status: slaStatus,
      escalationRequired: urgencyResult.escalationRequired,
      escalationReason: urgencyResult.escalationReason
    };

    // 5. Calculate confidence
    const confidenceResult = await calculateConfidence({
      classificationConfidence: classification.confidence,
      languageConfidence: languageResult.confidence,
      urgencyScore: urgencyResult.urgencyScore,
      category: classification.category,
      department: classification.department
    });

    const effectiveClassification = {
      ...classification,
      category: confidenceResult.category || classification.category,
      department: confidenceResult.department || classification.department,
      confidenceBand: confidenceResult.confidenceBand,
      requiresHumanReview: confidenceResult.requiresHumanReview,
      message: confidenceResult.message || classification.message
    };

    // 6. Route to department/authority
    const routingResult = await routeComplaint({
      category: effectiveClassification.category,
      priority: urgencyResult.priority,
      location,
      locationContext,
      urgency: urgencyResult
    });

    // 7. Generate explanation/reasoning
    const explanationResult = await generateExplanation({
      language: languageResult,
      classification: effectiveClassification,
      urgency: urgencyResult,
      routing: routingResult,
      confidence: confidenceResult
    });

    // 8. Construct final structured JSON object
    return {
      language: languageResult.language,
      translatedText: languageResult.translatedText,
      category: effectiveClassification.category,
      department: routingResult.department,
      priority: urgencyResult.priority,
      severityLevel: urgencyResult.severityLevel,
      confidence: confidenceResult.confidence,
      confidenceBand: confidenceResult.confidenceBand,
      slaHours: urgencyResult.slaHours, // Kept for compatibility
      sla, // New SLA object
      requiresHumanReview: confidenceResult.requiresHumanReview,
      routing: routingResult,
      inputQuality: classification.inputQuality,
      message: effectiveClassification.message,
      duplicateCheck,
      reasoning: explanationResult.reasoning,
      suggestedAction: explanationResult.suggestedAction,
      citizenMessage: explanationResult.citizenMessage,
      adminSummary: explanationResult.adminSummary,
      privacy: {
        piiMaskingApplied: privacyResult.maskingApplied,
        detectedPII: privacyResult.detectedPII,
        externalAITextMasked: true,
        note: "PII was masked before AI processing"
      },
      metadata: {
        pipelineVersion: "CivicTrust-AI-v1.1",
        processedAt: processedAt.toISOString(),
        modulesUsed: [
          "languageDetector",
          "classifierEngine",
          "urgencyEngine",
          "confidenceEngine",
          "routingEngine",
          "duplicateEngine",
          "explanationEngine"
        ]
      }
    };

  } catch (error) {
    console.error("Error in grievance analyzer pipeline:", error);
    throw new Error("Failed to analyze grievance intelligently.");
  }
};

module.exports = { analyzeGrievanceIntelligently };
