/**
 * Checks for duplicate or similar existing grievances using deterministic scoring and incident clustering.
 * @param {Object} input - Object containing text, category, location, priority, existingComplaints.
 * @returns {Object} - Details of the duplicate check and clustering.
 */
const detectDuplicatePlaceholder = async ({ text, category, location, priority, existingComplaints = [] }) => {
  const synonymGroups = {
    "Electricity": ["bijli", "electricity", "power", "current", "wire", "pole", "spark", "light", "transformer"],
    "Water Supply": ["pani", "water", "tap", "pipeline", "leakage", "supply", "nahi aa raha", "not coming"],
    "Sanitation": ["kachra", "garbage", "waste", "gandagi", "dirty", "drain", "nala", "sewage"],
    "Roads": ["road", "sadak", "pothole", "gaddha", "traffic", "bridge", "footpath"],
    "Public Safety": ["danger", "accident", "fire", "injury", "collapse", "school", "hospital", "emergency"]
  };

  const lowerText = (text || "").toLowerCase();
  const address = location && location.address ? location.address.toLowerCase() : "";
  const ward = location && location.ward ? location.ward.toLowerCase() : "";
  const zone = location && location.zone ? location.zone.toLowerCase() : "";
  const locationTokens = `${address} ${ward} ${zone}`.split(' ').filter(t => t.length > 2);

  // Split input text into word tokens
  const textTokens = lowerText.split(/\W+/).filter(t => t.length > 2);

  let bestMatch = null;
  let maxSimilarity = 0;
  let matchReasons = [];

  for (const existing of existingComplaints) {
    let score = 0;
    let reasons = [];
    const exLowerText = `${existing.title} ${existing.description}`.toLowerCase();
    const exTokens = exLowerText.split(/\W+/).filter(t => t.length > 2);

    const exAddress = existing.location && existing.location.address ? existing.location.address.toLowerCase() : "";
    const exWard = existing.location && existing.location.ward ? existing.location.ward.toLowerCase() : "";
    const exZone = existing.location && existing.location.zone ? existing.location.zone.toLowerCase() : "";
    const exLocTokens = `${exAddress} ${exWard} ${exZone}`.split(' ').filter(t => t.length > 2);

    // 1. Category match score (+0.25)
    if (category === existing.category) {
      score += 0.25;
      reasons.push("Category matched (+0.25)");
    }

    // 2. Synonym group overlap (+0.25)
    const synonyms = synonymGroups[category] || [];
    const hasInputSynonym = synonyms.some(syn => lowerText.includes(syn));
    const hasExistingSynonym = synonyms.some(syn => exLowerText.includes(syn));
    if (hasInputSynonym && hasExistingSynonym) {
      score += 0.25;
      reasons.push("Civic synonym overlap (+0.25)");
    }

    // 3. Keyword overlap score (+0.20)
    let overlapCount = 0;
    textTokens.forEach(token => {
      if (exTokens.includes(token)) overlapCount++;
    });
    if (overlapCount > 2) {
      score += 0.20;
      reasons.push(`High keyword overlap (${overlapCount} words) (+0.20)`);
    } else if (overlapCount > 0) {
      score += 0.10;
      reasons.push(`Partial keyword overlap (${overlapCount} words) (+0.10)`);
    }

    // 4. Location proximity/address match score (+0.20)
    let locOverlap = 0;
    locationTokens.forEach(token => {
      if (exLocTokens.includes(token)) locOverlap++;
    });
    if (locOverlap > 0 || (ward && ward === exWard)) {
      score += 0.20;
      reasons.push("Location/ward matched (+0.20)");
    }

    // 5. Time window & Status (+0.10)
    if (existing.status && existing.status !== 'Resolved' && existing.status !== 'Closed') {
      score += 0.10;
      reasons.push("Recent unresolved complaint (+0.10)");
    }

    if (score > maxSimilarity) {
      maxSimilarity = score;
      bestMatch = existing;
      matchReasons = reasons;
    }
  }

  const isDuplicate = maxSimilarity >= 0.65;
  let clusterId = null;
  let matchedComplaintIds = [];
  let clusterTitle = null;
  let clusterSeverity = null;
  let clusterLocation = null;

  if (isDuplicate) {
    const year = new Date().getFullYear();
    const catCode = category.substring(0, 4).toUpperCase();
    const wardCode = (location && location.ward ? location.ward.replace(/\s+/g, '').toUpperCase() : "UNASSIGNED");
    const count = Math.floor(Math.random() * 900) + 100;
    clusterId = `INC-${year}-${catCode}-${wardCode}-${count}`;

    matchedComplaintIds = [bestMatch._id];
    clusterTitle = bestMatch.title;
    clusterSeverity = bestMatch.priority;
    clusterLocation = bestMatch.location?.address || bestMatch.location?.ward || location?.ward || "Unknown";
    matchReasons.push(`Similarity score: ${maxSimilarity.toFixed(2)} >= 0.65 threshold`);
  }

  return {
    isDuplicate,
    clusterId,
    similarity: maxSimilarity,
    matchedComplaints: isDuplicate ? 1 : 0,
    matchedComplaintIds,
    clusterTitle,
    clusterSeverity,
    clusterLocation,
    reasons: matchReasons,
    note: "Lightweight semantic duplicate clustering applied."
  };
};

module.exports = { detectDuplicatePlaceholder };
