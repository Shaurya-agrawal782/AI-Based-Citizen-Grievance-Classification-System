const CIVIC_KEYWORDS = {
  Electricity: ['bijli', 'electricity', 'power', 'wire', 'pole', 'spark', 'sparking', 'current', 'transformer', 'light'],
  'Water Supply': ['pani', 'water', 'pipeline', 'tap', 'leakage', 'contaminated', 'dirty water', 'supply'],
  'Sanitation & Waste': ['kachra', 'garbage', 'waste', 'gandagi', 'drain', 'nala', 'sewage', 'cleaning'],
  'Public Infrastructure': ['road', 'sadak', 'pothole', 'gaddha', 'bridge', 'footpath', 'traffic', 'waterlogging', 'broken road'],
  'Public Safety': ['fire', 'accident', 'danger', 'injury', 'collapse', 'open manhole', 'school', 'hospital', 'emergency']
};

const FILLER_WORDS = new Set([
  'a', 'an', 'and', 'are', 'at', 'complaint', 'hai', 'he', 'help', 'in', 'issue',
  'ka', 'ke', 'ki', 'me', 'mein', 'my', 'of', 'on', 'our', 'par', 'please',
  'problem', 'se', 'the', 'to', 'urgent'
]);

const normalize = (text = '') => text.toString().toLowerCase().replace(/\s+/g, ' ').trim();

const keywordPattern = (keyword) => {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
};

const getMeaningfulWords = (text = '') => {
  const words = normalize(text).match(/[a-z\u0900-\u097f]+/gi) || [];
  return words.filter(word => word.length > 1 && !FILLER_WORDS.has(word));
};

export const getCivicKeywordMatches = (text = '') => {
  const normalized = normalize(text);
  const matchesByCategory = {};
  let totalMatches = 0;

  Object.entries(CIVIC_KEYWORDS).forEach(([category, keywords]) => {
    const matches = keywords.filter(keyword => keywordPattern(keyword).test(normalized));
    if (matches.length) {
      matchesByCategory[category] = matches;
      totalMatches += matches.length;
    }
  });

  return { matchesByCategory, totalMatches };
};

export const isMeaningfulComplaintText = (text = '') => {
  const trimmed = text.toString().trim();
  if (trimmed.length < 15) return false;
  if (getMeaningfulWords(trimmed).length < 3) return false;

  const civicMatches = getCivicKeywordMatches(trimmed);
  return civicMatches.totalMatches > 0;
};

export const buildNeedsReviewClassification = () => ({
  category: 'Other',
  suggestedDepartment: 'Manual Review Desk',
  confidence: 20,
  confidenceBand: 'Low',
  requiresHumanReview: true,
  alternatives: [],
  priority: 'low',
  sentiment: 'neutral',
  isUrgent: false,
  detectedLanguage: 'Not enough text',
  message: 'Please add more details for accurate classification.'
});

export const normalizeConfidencePercent = (confidence) => {
  const number = Number(confidence);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number <= 1 ? number * 100 : number);
};

export const isLowConfidenceClassification = (classification) => {
  if (!classification) return false;
  return classification.requiresHumanReview
    && (
      classification.confidenceBand === 'Low'
      || normalizeConfidencePercent(classification.confidence) < 40
      || classification.category === 'Other'
      || classification.suggestedDepartment === 'Manual Review Desk'
    );
};

export const categoryFromDepartment = (department) => ({
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
}[department] || 'Other');
