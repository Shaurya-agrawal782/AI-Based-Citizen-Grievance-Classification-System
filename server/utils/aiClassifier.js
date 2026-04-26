/**
 * CivicTrust AI Classifier
 * Simulated NLP-based classification engine that maps grievance descriptions
 * to government departments with confidence scores.
 */

const departmentKeywords = {
  'Public Works': {
    keywords: ['pothole', 'road', 'bridge', 'footpath', 'sidewalk', 'pavement', 'crack', 'broken road',
               'street damage', 'construction', 'infrastructure', 'highway', 'lane', 'asphalt',
               'traffic signal', 'sign', 'barricade', 'railing', 'overpass', 'underpass'],
    weight: 1.0
  },
  'Sanitation': {
    keywords: ['garbage', 'waste', 'trash', 'dirty', 'smell', 'odor', 'dump', 'sewage', 'drain',
               'blocked drain', 'overflow', 'sanitation', 'cleaning', 'sweeping', 'litter',
               'dustbin', 'compost', 'recycling', 'stagnant', 'mosquito', 'pest', 'rat'],
    weight: 1.0
  },
  'Water Authority': {
    keywords: ['water', 'leak', 'leakage', 'pipeline', 'pipe', 'supply', 'no water', 'water pressure',
               'contaminated', 'dirty water', 'bore', 'well', 'tank', 'water tank', 'flooding',
               'waterlogging', 'tap', 'meter', 'billing', 'sewage water'],
    weight: 1.0
  },
  'Electricity Board': {
    keywords: ['electricity', 'power', 'outage', 'blackout', 'streetlight', 'light', 'wire', 'cable',
               'transformer', 'pole', 'electric', 'shock', 'voltage', 'meter', 'billing',
               'exposed wire', 'short circuit', 'sparking', 'generator', 'solar'],
    weight: 1.0
  },
  'Municipal Safety': {
    keywords: ['safety', 'manhole', 'open manhole', 'hazard', 'danger', 'accident', 'fall', 'injury',
               'unsafe', 'risk', 'fire', 'collapse', 'building', 'illegal', 'encroachment',
               'stray', 'dog', 'animal', 'crime', 'theft', 'security', 'cctv', 'camera']
  }
};

const priorityKeywords = {
  high: ['urgent', 'emergency', 'danger', 'hazard', 'collapse', 'accident', 'injury', 'death',
         'fire', 'flood', 'critical', 'severe', 'immediate', 'life-threatening', 'exposed wire',
         'open manhole', 'structural', 'cracking', 'sinking'],
  medium: ['broken', 'damaged', 'not working', 'leaking', 'overflow', 'blocked', 'frequent',
           'recurring', 'worse', 'escalating', 'multiple', 'complaints', 'weeks'],
  low: ['minor', 'cosmetic', 'small', 'slight', 'occasional', 'suggestion', 'improvement',
        'request', 'general', 'inquiry']
};

function classifyGrievance(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const scores = {};
  
  // Calculate department scores
  for (const [dept, config] of Object.entries(departmentKeywords)) {
    let score = 0;
    let matchedKeywords = [];
    
    for (const keyword of config.keywords) {
      if (text.includes(keyword)) {
        score += 1;
        matchedKeywords.push(keyword);
      }
    }
    
    scores[dept] = {
      score,
      confidence: 0,
      matchedKeywords
    };
  }
  
  // Calculate total and confidence percentages
  const totalScore = Object.values(scores).reduce((sum, s) => sum + s.score, 0);
  
  if (totalScore === 0) {
    // Default classification with low confidence
    return {
      suggestedDepartment: 'Public Works',
      confidence: 25,
      alternatives: [
        { department: 'Sanitation', confidence: 20 },
        { department: 'Municipal Safety', confidence: 15 }
      ],
      summary: generateSummary(title, description, 'Public Works')
    };
  }
  
  // Calculate confidence for each department
  for (const dept of Object.keys(scores)) {
    scores[dept].confidence = Math.round((scores[dept].score / totalScore) * 100);
  }
  
  // Sort by confidence
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1].confidence - a[1].confidence);
  
  const primary = sorted[0];
  const alternatives = sorted.slice(1, 3)
    .filter(([_, data]) => data.confidence > 0)
    .map(([dept, data]) => ({
      department: dept,
      confidence: data.confidence
    }));
  
  return {
    suggestedDepartment: primary[0],
    confidence: Math.min(primary[1].confidence, 97),
    alternatives,
    summary: generateSummary(title, description, primary[0])
  };
}

function classifyPriority(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  let highScore = 0, mediumScore = 0, lowScore = 0;
  
  for (const keyword of priorityKeywords.high) {
    if (text.includes(keyword)) highScore += 2;
  }
  for (const keyword of priorityKeywords.medium) {
    if (text.includes(keyword)) mediumScore += 1;
  }
  for (const keyword of priorityKeywords.low) {
    if (text.includes(keyword)) lowScore += 1;
  }
  
  if (highScore >= 2) return 'high';
  if (mediumScore >= 2 || highScore === 1) return 'medium';
  return 'low';
}

function generateSummary(title, description, department) {
  const desc = description.length > 150 ? description.substring(0, 150) + '...' : description;
  return `Citizen reports: ${title}. ${desc} This issue has been classified under ${department} for review and action.`;
}

function checkDuplicate(title, description, existingGrievances) {
  const text = `${title} ${description}`.toLowerCase();
  const words = text.split(/\s+/).filter(w => w.length > 3);
  
  for (const grievance of existingGrievances) {
    const existingText = `${grievance.title} ${grievance.description}`.toLowerCase();
    let matchCount = 0;
    
    for (const word of words) {
      if (existingText.includes(word)) matchCount++;
    }
    
    const similarity = words.length > 0 ? (matchCount / words.length) * 100 : 0;
    
    if (similarity > 60) {
      return {
        isDuplicate: true,
        similarity: Math.round(similarity),
        existingGrievance: {
          trackingId: grievance.trackingId,
          title: grievance.title,
          status: grievance.status
        }
      };
    }
  }
  
  return { isDuplicate: false, similarity: 0 };
}

module.exports = { classifyGrievance, classifyPriority, checkDuplicate };
