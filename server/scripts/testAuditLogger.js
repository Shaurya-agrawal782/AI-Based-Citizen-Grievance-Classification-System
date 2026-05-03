const { createAuditEntry, createCaseHistoryEntry, appendAuditLog, appendCaseHistory } = require('../utils/auditLogger');

const runAuditTests = () => {
  console.log('Starting Audit Logger Tests...\n');

  // Mock grievance object
  const mockGrievance = {
    _id: 'G-TEST-001',
    trackingId: 'GRV-1001',
    title: 'Electric pole sparking near school',
    status: 'submitted',
    auditTrail: [],
    caseHistory: []
  };

  // Test 1: Audit Entry - Grievance Created
  const citizenActor = { userId: 'USR-001', name: 'Ramesh Kumar', role: 'citizen' };
  const createdEntry = createAuditEntry({
    action: 'GRIEVANCE_CREATED',
    performedBy: citizenActor,
    newValue: { status: 'submitted', category: 'Electricity', priority: 'high' },
    reason: 'Citizen submitted grievance via CivicTrust portal'
  });
  appendAuditLog(mockGrievance, createdEntry);

  // Test 2: Audit Entry - AI Classification (system-generated)
  const aiEntry = createAuditEntry({
    action: 'AI_CLASSIFICATION_APPLIED',
    systemGenerated: true,
    newValue: { department: 'Electricity Board', confidence: 0.92, priority: 'Critical' },
    reason: 'AI intelligence pipeline classified grievance'
  });
  appendAuditLog(mockGrievance, aiEntry);

  // Test 3: Audit Entry - Status Updated
  const adminActor = { userId: 'USR-002', name: 'Admin Singh', role: 'admin' };
  const statusEntry = createAuditEntry({
    action: 'STATUS_UPDATED',
    performedBy: adminActor,
    oldValue: { status: 'submitted' },
    newValue: { status: 'in-progress' },
    reason: 'Assigned field team for investigation'
  });
  appendAuditLog(mockGrievance, statusEntry);

  // Test 4: Audit Entry - Escalation
  const escalateEntry = createAuditEntry({
    action: 'GRIEVANCE_ESCALATED',
    performedBy: adminActor,
    newValue: { status: 'escalated', priority: 'high' },
    reason: 'Near school — life safety risk'
  });
  appendAuditLog(mockGrievance, escalateEntry);

  // Test 5: Case History - Citizen-visible entries
  appendCaseHistory(mockGrievance, createCaseHistoryEntry({
    status: 'submitted',
    note: 'Your grievance has been submitted successfully.',
    actor: { name: 'CivicTrust System', role: 'system' },
    visibility: 'citizen'
  }));

  appendCaseHistory(mockGrievance, createCaseHistoryEntry({
    status: 'in-progress',
    note: 'Field team assigned for inspection.',
    actor: { name: 'Admin Singh', role: 'admin' },
    visibility: 'citizen'
  }));

  appendCaseHistory(mockGrievance, createCaseHistoryEntry({
    status: 'escalated',
    note: 'Internal escalation note for higher authority.',
    actor: { name: 'Admin Singh', role: 'admin' },
    visibility: 'internal'
  }));

  console.log('Audit Trail:');
  console.log(JSON.stringify(mockGrievance.auditTrail, null, 2));

  console.log('\nFull Case History:');
  console.log(JSON.stringify(mockGrievance.caseHistory, null, 2));

  console.log('\nCitizen-Visible Case History (filtered):');
  const citizenView = mockGrievance.caseHistory.filter(e => e.visibility === 'citizen' || e.visibility === 'public');
  console.log(JSON.stringify(citizenView, null, 2));

  console.log(`\n✅ Audit Trail entries: ${mockGrievance.auditTrail.length}`);
  console.log(`✅ Case History entries: ${mockGrievance.caseHistory.length}`);
  console.log(`✅ Citizen-visible entries: ${citizenView.length}`);
};

runAuditTests();
