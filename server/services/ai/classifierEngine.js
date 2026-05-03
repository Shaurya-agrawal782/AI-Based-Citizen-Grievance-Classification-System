/**
 * Classifies the grievance into a specific category.
 * @param {string} text - The input grievance text.
 * @returns {Object} - Classification details.
 */
const classifyComplaint = async (text) => {
  const categories = {
    "Electricity": ['bijli', 'electricity', 'power', 'transformer', 'wire', 'pole', 'spark', 'current', 'light'],
    "Water Supply": ['pani', 'water', 'pipeline', 'tap', 'leakage', 'sewage water', 'contaminated'],
    "Sanitation": ['garbage', 'kachra', 'waste', 'dirty', 'gandagi', 'cleaning', 'drain', 'nala'],
    "Roads": ['road', 'sadak', 'pothole', 'traffic', 'bridge', 'footpath', 'street'],
    "Public Safety": ['accident', 'fire', 'danger', 'hospital', 'school', 'collapse', 'emergency', 'injury']
  };

  const lowerText = text.toLowerCase();
  let bestCategory = "Other";
  let maxScore = 0;
  let matchedSignals = [];

  for (const [cat, keywords] of Object.entries(categories)) {
    let score = 0;
    let localMatches = [];
    keywords.forEach(kw => {
      if (lowerText.includes(kw)) {
        score++;
        localMatches.push(kw);
      }
    });

    if (score > maxScore) {
      maxScore = score;
      bestCategory = cat;
      matchedSignals = localMatches;
    }
  }

  let confidence = 0.5;
  if (maxScore > 0) {
    confidence = Math.min(0.6 + (maxScore * 0.1), 0.95);
  } else {
    confidence = 0.4;
  }

  // Basic department mapping
  const departmentMapping = {
    "Electricity": "Electricity Department",
    "Water Supply": "Water Supply Department",
    "Sanitation": "Sanitation Department",
    "Roads": "Public Works Department",
    "Public Safety": "Emergency Response Cell",
    "Other": "General Administration"
  };

  return {
    category: bestCategory,
    department: departmentMapping[bestCategory],
    confidence,
    matchedSignals
  };
};

module.exports = { classifyComplaint };
