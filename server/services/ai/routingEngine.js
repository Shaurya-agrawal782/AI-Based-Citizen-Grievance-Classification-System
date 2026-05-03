/**
 * Determines the appropriate department to route the grievance to.
 * @param {Object} input - Object containing category, priority, location, locationContext, urgency.
 * @returns {Object} - Object containing routing details.
 */
const routeComplaint = async ({ category, priority, location, locationContext, urgency }) => {
  const authorityData = {
    "Ward 1": {
      zone: "North",
      officers: {
        "Electricity": { name: "Rahul Verma", role: "Ward Electricity Officer", contact: "+91-9000000001" },
        "Water Supply": { name: "Neha Sharma", role: "Ward Water Officer", contact: "+91-9000000002" },
        "Sanitation": { name: "Amit Patel", role: "Sanitation Supervisor", contact: "+91-9000000003" },
        "Roads": { name: "Priya Singh", role: "Road Maintenance Officer", contact: "+91-9000000004" },
        "Public Safety": { name: "Control Room North", role: "Safety Control Officer", contact: "+91-9000000005" }
      }
    },
    "Ward 2": {
      zone: "Central",
      officers: {
        "Electricity": { name: "Suresh Yadav", role: "Ward Electricity Officer", contact: "+91-9000000011" },
        "Water Supply": { name: "Kavita Rao", role: "Ward Water Officer", contact: "+91-9000000012" },
        "Sanitation": { name: "Imran Khan", role: "Sanitation Supervisor", contact: "+91-9000000013" },
        "Roads": { name: "Meera Joshi", role: "Road Maintenance Officer", contact: "+91-9000000014" },
        "Public Safety": { name: "Control Room Central", role: "Safety Control Officer", contact: "+91-9000000015" }
      }
    },
    "Ward 3": {
      zone: "South",
      officers: {
        "Electricity": { name: "Anil Gupta", role: "Ward Electricity Officer", contact: "+91-9000000021" },
        "Water Supply": { name: "Pooja Mishra", role: "Ward Water Officer", contact: "+91-9000000022" },
        "Sanitation": { name: "Rakesh Tiwari", role: "Sanitation Supervisor", contact: "+91-9000000023" },
        "Roads": { name: "Sunita Choudhary", role: "Road Maintenance Officer", contact: "+91-9000000024" },
        "Public Safety": { name: "Control Room South", role: "Safety Control Officer", contact: "+91-9000000025" }
      }
    },
    "Fallback": {
      "Manual Review Desk": { name: "Triage Officer", role: "Triage Officer", contact: "+91-9000000099" }
    }
  };

  const departmentMapping = {
    "Electricity": "Electricity Department",
    "Water Supply": "Water Supply Department",
    "Sanitation": "Sanitation Department",
    "Roads": "Public Works Department",
    "Public Safety": "Emergency Response Cell",
    "Other": "Manual Review Desk"
  };

  const department = departmentMapping[category] || "Manual Review Desk";

  // Ward and Zone detection
  let ward = null;
  let zone = null;
  let fallbackUsed = false;
  const address = location && location.address ? location.address.toLowerCase() : "";
  const context = locationContext ? locationContext.toLowerCase() : "";
  const combinedLoc = `${address} ${context}`;

  if (location && location.ward && location.zone) {
    ward = location.ward;
    zone = location.zone;
  } else if (combinedLoc.includes("north") || combinedLoc.includes("ward 1") || combinedLoc.includes("school road")) {
    ward = "Ward 1";
    zone = "North";
  } else if (combinedLoc.includes("central") || combinedLoc.includes("ward 2") || combinedLoc.includes("market") || combinedLoc.includes("hospital")) {
    ward = "Ward 2";
    zone = "Central";
  } else if (combinedLoc.includes("south") || combinedLoc.includes("ward 3") || combinedLoc.includes("bus stand")) {
    ward = "Ward 3";
    zone = "South";
  } else {
    ward = "Ward 2";
    zone = "Central";
    fallbackUsed = true;
  }

  // Find officer
  let assignedAuthority = "Triage Officer";
  let officerName = "Triage Officer";
  let officerRole = "Triage Officer";
  let officerContact = "+91-9000000099";

  if (category === "Other") {
    const fb = authorityData["Fallback"]["Manual Review Desk"];
    assignedAuthority = fb.role;
    officerName = fb.name;
    officerRole = fb.role;
    officerContact = fb.contact;
  } else {
    const wardData = authorityData[ward];
    if (wardData && wardData.officers[category]) {
      const officerInfo = wardData.officers[category];
      assignedAuthority = officerInfo.role;
      officerName = officerInfo.name;
      officerRole = officerInfo.role;
      officerContact = officerInfo.contact;
    }
  }

  // Escalation logic
  let escalationLevel = "Standard Department Queue";
  let escalationOfficer = "Not required";
  let operationalAction = "Schedule routine inspection and resolution";

  if (priority === "Critical") {
    escalationLevel = "Level 2 Emergency Escalation";
    escalationOfficer = "Zone Emergency Coordinator";
    operationalAction = "Immediate field inspection, risk isolation, and emergency response dispatch";
  } else if (priority === "Urgent") {
    escalationLevel = "Level 1 Supervisor Escalation";
    escalationOfficer = "Department Supervisor";
    operationalAction = "Assign field team within SLA and monitor progress";
  } else if (priority === "Normal") {
    escalationLevel = "Standard Department Queue";
    escalationOfficer = "Not required";
    operationalAction = "Schedule routine inspection and resolution";
  } else if (priority === "Review") {
    escalationLevel = "Manual Triage Queue";
    escalationOfficer = "Triage Officer";
    operationalAction = "Review complaint manually before assignment";
  }

  let routingReason = `Routed to ${ward} ${assignedAuthority} because the complaint category is ${category} and location matched Zone ${zone}.`;
  if (category === "Other") {
    routingReason = `Routed to Manual Review Desk because category is Other.`;
  }

  return {
    department,
    assignedAuthority,
    ward,
    zone,
    officerName,
    officerRole,
    officerContact,
    escalationLevel,
    escalationOfficer,
    operationalAction,
    routingReason,
    fallbackUsed
  };
};

module.exports = { routeComplaint };
