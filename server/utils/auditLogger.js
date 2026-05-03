/**
 * Audit Logger utility for Grievance tracking
 */

const createAuditEntry = ({ action, performedBy, oldValue = null, newValue = null, reason = "", systemGenerated = false }) => {
  const actor = performedBy || { name: "CivicTrust System", role: "system" };

  return {
    action,
    performedBy: {
      userId: actor.userId || null,
      name: actor.name || "Unknown",
      role: actor.role || "unknown"
    },
    timestamp: new Date(),
    oldValue,
    newValue,
    reason,
    systemGenerated
  };
};

const createCaseHistoryEntry = ({ status, note, actor, visibility = "internal" }) => {
  const historyActor = actor || { name: "System", role: "system" };
  return {
    status,
    note,
    timestamp: new Date(),
    actor: {
      name: historyActor.name || "Unknown",
      role: historyActor.role || "unknown"
    },
    visibility
  };
};

const appendAuditLog = (grievance, auditEntry) => {
  if (!grievance.auditTrail) {
    grievance.auditTrail = [];
  }
  grievance.auditTrail.push(auditEntry);
  return grievance;
};

const appendCaseHistory = (grievance, historyEntry) => {
  if (!grievance.caseHistory) {
    grievance.caseHistory = [];
  }
  grievance.caseHistory.push(historyEntry);
  return grievance;
};

module.exports = {
  createAuditEntry,
  createCaseHistoryEntry,
  appendAuditLog,
  appendCaseHistory
};
