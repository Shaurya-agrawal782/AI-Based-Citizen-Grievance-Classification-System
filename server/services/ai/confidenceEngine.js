/**
 * Calculates the confidence score of the AI's analysis and determines if human review is needed.
 * @param {Object} input - Object containing classificationConfidence, languageConfidence, urgencyScore, category.
 * @returns {Object} - Confidence score, requiresHumanReview flag, confidenceBand.
 */
const calculateConfidence = async ({ classificationConfidence, languageConfidence, urgencyScore, category }) => {
  const confidence = (classificationConfidence * 0.6) + (languageConfidence * 0.2) + (urgencyScore * 0.2);

  const requiresHumanReview = confidence < 0.65 || category === "Other";

  let confidenceBand = "Low";
  if (confidence >= 0.8) {
    confidenceBand = "High";
  } else if (confidence >= 0.6) {
    confidenceBand = "Medium";
  }

  return {
    confidence: Number(confidence.toFixed(2)),
    requiresHumanReview,
    confidenceBand
  };
};

module.exports = { calculateConfidence };
