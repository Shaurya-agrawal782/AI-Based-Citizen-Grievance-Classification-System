const { analyzeGrievanceIntelligently } = require('../services/ai');

const runTests = async () => {
  const mockExistingComplaints = [
    {
      _id: "G1",
      title: "Electric pole sparking",
      description: "Bijli ka pole spark kar raha hai school ke paas",
      category: "Electricity",
      priority: "Critical",
      location: { address: "School Road Ward 1 North", ward: "Ward 1", zone: "North" },
      status: "Open",
      createdAt: new Date()
    },
    {
      _id: "G2",
      title: "Water supply stopped",
      description: "Pani nahi aa raha ward 3 me",
      category: "Water Supply",
      priority: "Urgent",
      location: { address: "Bus Stand Ward 3 South", ward: "Ward 3", zone: "South" },
      status: "Open",
      createdAt: new Date()
    }
  ];

  const sampleComplaints = [
    {
      title: "Spark on pole",
      description: "School Road par electricity pole se spark aa raha hai",
      location: { address: "School Road Ward 1 North", ward: "Ward 1", zone: "North" },
      locationContext: "North Zone",
      existingComplaints: mockExistingComplaints
    },
    {
      title: "No water",
      description: "Ward 3 south me pani supply band hai",
      location: { address: "Ward 3", ward: "Ward 3", zone: "South" },
      locationContext: "South Zone",
      existingComplaints: mockExistingComplaints
    },
    {
      title: "Garbage problem",
      description: "Market me garbage jama hai",
      location: { address: "Market Area", ward: "Ward 2", zone: "Central" },
      locationContext: "Central Zone",
      existingComplaints: mockExistingComplaints
    },
    {
      title: "Mixed PII Complaint",
      description: "My phone number is 9876543210 and email is test@example.com. House No. 45 ke paas bijli ka pole spark kar raha hai.",
      location: { address: "House No. 45, Ward 1", ward: "Ward 1", zone: "North" },
      locationContext: "North Zone",
      existingComplaints: mockExistingComplaints
    }
  ];

  console.log("Starting AI Intelligence Layer Duplicate Tests...\n");

  for (let i = 0; i < sampleComplaints.length; i++) {
    const input = sampleComplaints[i];
    console.log(`--- Test Case ${i + 1} ---`);
    console.log(`Input Text: "${input.title} - ${input.description}"`);

    try {
      const result = await analyzeGrievanceIntelligently(input);
      console.log("Result (Filtered):");
      console.log(JSON.stringify({
        originalText: `${input.title} - ${input.description}`,
        privacy: result.privacy,
        category: result.category,
        priority: result.priority,
        duplicateCheck: {
          isDuplicate: result.duplicateCheck.isDuplicate,
          similarity: result.duplicateCheck.similarity,
          clusterId: result.duplicateCheck.clusterId,
          matchedComplaints: result.duplicateCheck.matchedComplaints,
          reasons: result.duplicateCheck.reasons
        }
      }, null, 2));
    } catch (error) {
      console.error("Error running test:", error);
    }
    console.log("\n");
  }
};

runTests();
