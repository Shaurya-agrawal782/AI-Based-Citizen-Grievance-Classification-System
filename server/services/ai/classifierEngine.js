const { evaluateComplaintTextQuality, getDepartmentForCategory } = require('./inputQuality');

/**
 * Classifies the grievance into a specific category.
 * @param {string} text - The input grievance text.
 * @returns {Object} - Classification details.
 */
const classifyComplaint = async (text = '') => {
  const categories = {
    Electricity: ['bijli', 'electricity', 'power', 'transformer', 'wire', 'pole', 'spark', 'sparking', 'current', 'light'],
    'Water Supply': ['pani', 'water', 'pipeline', 'tap', 'leakage', 'contaminated', 'dirty water', 'supply'],
    Sanitation: ['kachra', 'garbage', 'waste', 'gandagi', 'drain', 'nala', 'sewage', 'cleaning'],
    Roads: ['road', 'sadak', 'pothole', 'gaddha', 'bridge', 'footpath', 'traffic', 'waterlogging', 'broken road'],
    'Public Safety': ['fire', 'accident', 'danger', 'injury', 'collapse', 'open manhole', 'school', 'hospital', 'emergency']
  };

  const inputQuality = evaluateComplaintTextQuality(text);
  if (!inputQuality.isMeaningful) {
    return manualReviewClassification(0.2, [], inputQuality);
  }

  const lowerText = text.toLowerCase();
  let bestCategory = 'Other';
  let maxScore = 0;
  let totalScore = 0;
  let matchedSignals = [];

  for (const [category, keywords] of Object.entries(categories)) {
    let score = 0;
    const localMatches = [];

    keywords.forEach((keyword) => {
      if (lowerText.includes(keyword)) {
        score += 1;
        localMatches.push(keyword);
      }
    });

    totalScore += score;

    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
      matchedSignals = localMatches;
    }
  }

  if (maxScore === 0) {
    return manualReviewClassification(0.25, [], inputQuality);
  }

  const share = totalScore > 0 ? maxScore / totalScore : 0;
  const confidence = Math.min(0.35 + (maxScore * 0.18) + (share * 0.22), 0.97);

  if (confidence < 0.4) {
    return manualReviewClassification(confidence, matchedSignals, inputQuality);
  }

  const confidenceBand = confidence < 0.65 ? 'Medium' : 'High';

  return {
    category: bestCategory,
    department: getDepartmentForCategory(bestCategory),
    confidence: Number(confidence.toFixed(2)),
    confidenceBand,
    requiresHumanReview: confidence < 0.65,
    matchedSignals,
    message: confidence < 0.65 ? 'This complaint may need human review before final routing.' : '',
    inputQuality
  };
};

const manualReviewClassification = (confidence, matchedSignals, inputQuality) => ({
  category: 'Other',
  department: 'Manual Review Desk',
  confidence: Number(Math.max(0, Math.min(confidence, 0.39)).toFixed(2)),
  confidenceBand: 'Low',
  requiresHumanReview: true,
  matchedSignals,
  message: 'Please add more details for accurate classification.',
  inputQuality
});

module.exports = { classifyComplaint };
