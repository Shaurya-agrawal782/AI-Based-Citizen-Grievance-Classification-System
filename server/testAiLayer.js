const { analyzeGrievanceIntelligently } = require('./services/ai');

const test = async () => {
  try {
    const mockInput = "There is a massive pothole on Main St that needs urgent repair.";
    console.log("Testing AI Intelligence Layer...");
    console.log(`Input: "${mockInput}"\n`);

    const result = await analyzeGrievanceIntelligently(mockInput);

    console.log("Result:");
    console.log(JSON.stringify(result, null, 2));

    console.log("\n✅ Import and execution successful. Production remains unaffected.");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};

test();
