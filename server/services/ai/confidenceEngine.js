/**
 * Calculates the confidence score of the AI's analysis and determines if human review is needed.
 * @param {Object} input - Object containing classificationConfidence, languageConfidence, urgencyScore, category.
 * @returns {Object} - Confidence score, requiresHumanReview flag, confidenceBand.
 */
const calculateConfidence = async ({ classificationConfidence, languageConfidence, urgencyScore, category, department }) => {
  const confidence = (classificationConfidence * 0.6) + (languageConfidence * 0.2) + (urgencyScore * 0.2);

  let confidenceBand = "Low";
  let requiresHumanReview = true;
  let finalCategory = category;
  let finalDepartment = department;
  let message = '';

  if (confidence < 0.4 || category === "Other") {
    confidenceBand = "Low";
    requiresHumanReview = true;
    finalCategory = "Other";
    finalDepartment = "Manual Review Desk";
    message = "Please add more details for accurate classification.";
  } else if (confidence < 0.65) {
    confidenceBand = "Medium";
    requiresHumanReview = true;
  } else {
    confidenceBand = "High";
    requiresHumanReview = false;
  }

  return {
    confidence: Number(confidence.toFixed(2)),
    requiresHumanReview,
    confidenceBand,
    category: finalCategory,
    department: finalDepartment,
    message
  };
};

module.exports = { calculateConfidence };
