const CIVIC_KEYWORDS = {
  Electricity: ['bijli', 'electricity', 'power', 'wire', 'pole', 'spark', 'sparking', 'current', 'transformer', 'light'],
  'Water Supply': ['pani', 'water', 'pipeline', 'tap', 'leakage', 'contaminated', 'dirty water', 'supply'],
  Sanitation: ['kachra', 'garbage', 'waste', 'gandagi', 'drain', 'nala', 'sewage', 'cleaning'],
  Roads: ['road', 'sadak', 'pothole', 'gaddha', 'bridge', 'footpath', 'traffic', 'waterlogging', 'broken road'],
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

const tokenizeMeaningfulWords = (text = '') => {
  const words = normalize(text).match(/[a-z\u0900-\u097f]+/gi) || [];
  return words.filter(word => word.length > 1 && !FILLER_WORDS.has(word));
};

const getCivicKeywordMatches = (text = '') => {
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

  const primaryCategory = Object.entries(matchesByCategory)
    .sort((a, b) => b[1].length - a[1].length)[0]?.[0] || null;

  return { matchesByCategory, totalMatches, primaryCategory };
};

const looksRandomWithoutCivicSignals = (text = '') => {
  const normalized = normalize(text).replace(/[^a-z]/g, '');
  if (normalized.length < 6) return true;
  if (/^(.)\1{4,}$/.test(normalized)) return true;

  const vowelCount = (normalized.match(/[aeiou]/g) || []).length;
  const vowelRatio = vowelCount / normalized.length;
  return vowelRatio < 0.15 || vowelRatio > 0.85;
};

const evaluateComplaintTextQuality = (text = '') => {
  const trimmed = text.toString().trim();
  const meaningfulWords = tokenizeMeaningfulWords(trimmed);
  const civicMatches = getCivicKeywordMatches(trimmed);

  let reason = '';
  if (trimmed.length < 15) {
    reason = 'Complaint text is too short.';
  } else if (meaningfulWords.length < 3) {
    reason = 'Complaint text has too few meaningful words.';
  } else if (civicMatches.totalMatches === 0) {
    reason = looksRandomWithoutCivicSignals(trimmed)
      ? 'Complaint text appears random and has no civic keywords.'
      : 'Complaint text has no civic department keywords.';
  }

  return {
    isMeaningful: !reason,
    reason,
    meaningfulWordCount: meaningfulWords.length,
    meaningfulWords,
    civicKeywordCount: civicMatches.totalMatches,
    civicMatches: civicMatches.matchesByCategory,
    primaryCategory: civicMatches.primaryCategory
  };
};

const isMeaningfulComplaintText = (text = '') => evaluateComplaintTextQuality(text).isMeaningful;

const getDepartmentForCategory = (category) => ({
  Electricity: 'Electricity Department',
  'Water Supply': 'Water Supply Department',
  Sanitation: 'Sanitation Department',
  Roads: 'Public Works Department',
  'Public Safety': 'Emergency Response Cell',
  Other: 'Manual Review Desk'
}[category] || 'Manual Review Desk');

module.exports = {
  CIVIC_KEYWORDS,
  evaluateComplaintTextQuality,
  getDepartmentForCategory,
  isMeaningfulComplaintText
};
