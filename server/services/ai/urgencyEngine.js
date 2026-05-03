/**
 * Calculates the urgency, SLA (Service Level Agreement) hours, and severity level.
 * @param {Object} input - Object containing text, category, locationContext, duplicateCheck.
 * @returns {Object} - Object containing priority, slaHours, urgencyScore, severityLevel, escalationRequired, escalationReason, reasons, policySignals.
 */
const calculateUrgency = async ({ text, category, locationContext, duplicateCheck }) => {
  const policySignalsGroups = {
    "Life Safety Risk": ['exposed wire', 'live wire', 'spark', 'sparking', 'current', 'electric shock', 'fire', 'blast', 'collapse', 'accident', 'injury', 'death', 'open manhole', 'gas leak', 'danger', 'school', 'hospital', 'children', 'bachche', 'danger hai', 'jaan ka khatra'],
    "Public Health Risk": ['contaminated water', 'dirty water', 'sewage water', 'bad smell', 'garbage near hospital', 'kachra hospital', 'nala overflow', 'disease', 'infection', 'mosquitoes', 'dengue', 'malaria'],
    "Essential Service Disruption": ['no water', 'pani nahi aa raha', 'water not coming', 'power cut', 'electricity not available', 'transformer blast', 'supply stopped', '2 din se', '3 din se'],
    "Infrastructure Risk": ['pothole', 'road broken', 'sadak kharab', 'bridge crack', 'drainage blocked', 'water logging', 'flooding', 'collapsed road']
  };

  const lowerText = (text || "").toLowerCase();
  const lowerContext = (locationContext || "").toLowerCase();
  const combinedText = `${lowerText} ${lowerContext}`;

  let priority = "Normal";
  let slaHours = 72;
  let urgencyScore = 0.3;
  let severityLevel = "Civic Maintenance";
  let escalationRequired = false;
  let escalationReason = null;
  let reasons = [];
  let policySignals = [];

  if (text.trim().length < 10 || category === "Other") {
    return {
      priority: "Review",
      slaHours: null,
      urgencyScore: 0.1,
      severityLevel: "Manual Review",
      escalationRequired: false,
      escalationReason: "Manual triage required due to unclear complaint",
      reasons: ["Complaint text is too short, unclear, or category is Other"],
      policySignals: []
    };
  }

  // Detect policy signals
  let isLifeSafety = false;
  let isPublicHealth = false;
  let isEssentialService = false;
  let isInfrastructureRisk = false;

  policySignalsGroups["Life Safety Risk"].forEach(kw => {
    if (combinedText.includes(kw)) {
      isLifeSafety = true;
      policySignals.push(`Life Safety Risk: ${kw}`);
      reasons.push(`Detected Life Safety signal: ${kw}`);
    }
  });

  policySignalsGroups["Public Health Risk"].forEach(kw => {
    if (combinedText.includes(kw)) {
      isPublicHealth = true;
      policySignals.push(`Public Health Risk: ${kw}`);
      reasons.push(`Detected Public Health signal: ${kw}`);
    }
  });

  policySignalsGroups["Essential Service Disruption"].forEach(kw => {
    if (combinedText.includes(kw)) {
      isEssentialService = true;
      policySignals.push(`Essential Service Disruption: ${kw}`);
      reasons.push(`Detected Essential Service signal: ${kw}`);
    }
  });

  policySignalsGroups["Infrastructure Risk"].forEach(kw => {
    if (combinedText.includes(kw)) {
      isInfrastructureRisk = true;
      policySignals.push(`Infrastructure Risk: ${kw}`);
      reasons.push(`Detected Infrastructure Risk signal: ${kw}`);
    }
  });

  if (isLifeSafety) {
    priority = "Critical";
    slaHours = 4;
    urgencyScore = 0.95;
    severityLevel = "Life Safety Risk";
    escalationRequired = true;
    escalationReason = "Immediate safety risk detected";
  } else if (isPublicHealth || isEssentialService || isInfrastructureRisk || (duplicateCheck && duplicateCheck.isDuplicate)) {
    priority = "Urgent";
    slaHours = 24;
    urgencyScore = 0.7;
    if (isPublicHealth) severityLevel = "Public Health Risk";
    else if (isEssentialService) severityLevel = "Essential Service Disruption";
    else severityLevel = "Infrastructure Risk";

    escalationRequired = true;
    escalationReason = "Time-sensitive public service issue detected";
  } else {
    reasons.push("Standard civic maintenance issue.");
  }

  return {
    priority,
    slaHours,
    urgencyScore,
    severityLevel,
    escalationRequired,
    escalationReason,
    reasons,
    policySignals
  };
};

module.exports = { calculateUrgency };
