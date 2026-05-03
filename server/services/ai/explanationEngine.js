/**
 * Generates reasoning and suggested actions based on the analysis.
 * @param {Object} input - Object containing language, classification, urgency, routing, confidence.
 * @returns {Object} - Reasoning, suggestedAction, citizenMessage, adminSummary.
 */
const generateExplanation = async ({ language, classification, urgency, routing, confidence }) => {
  const reasoning = [
    `Language detected as ${language.language} with ${Math.round(language.confidence * 100)}% confidence.`,
    `Categorized as ${classification.category} based on keywords: ${classification.matchedSignals.join(', ') || 'None'}.`
  ];

  if (urgency.policySignals && urgency.policySignals.length > 0) {
    reasoning.push(`Complaint mentions: ${urgency.policySignals.join(', ')}.`);
  }

  reasoning.push(`Policy engine marked this as ${urgency.priority} with ${urgency.slaHours ? urgency.slaHours + '-hour SLA' : 'no SLA'}.`);

  if (urgency.escalationRequired) {
    reasoning.push(`Emergency escalation is required: ${urgency.escalationReason}.`);
  }

  reasoning.push(`Routed to ${routing.department} -> ${routing.assignedAuthority} (${routing.officerName}).`);
  reasoning.push(`Location matched: ${routing.ward}, Zone ${routing.zone}.`);
  reasoning.push(`Escalation Level: ${routing.escalationLevel}.`);
  reasoning.push(`Operational Action: ${routing.operationalAction}.`);

  let citizenMessage = `Your complaint regarding ${classification.category} has been received and routed to the ${routing.department}.`;
  if (urgency.priority === "Critical") {
    citizenMessage += ` It has been marked as a critical emergency and escalated.`;
  } else if (urgency.slaHours) {
    citizenMessage += ` It is expected to be resolved within ${urgency.slaHours} hours.`;
  }

  const adminSummary = `[${urgency.priority}] ${classification.category} complaint assigned to ${routing.assignedAuthority} (${routing.officerName}) in ${routing.ward}. Severity: ${urgency.severityLevel}. Confidence: ${confidence.confidenceBand}.`;

  const suggestedAction = urgency.priority === "Critical" ?
    "Immediate dispatch required. " + routing.operationalAction :
    `Standard processing within ${urgency.slaHours || 72} hours. ` + routing.operationalAction;

  return {
    reasoning,
    suggestedAction,
    citizenMessage,
    adminSummary
  };
};

module.exports = { generateExplanation };
