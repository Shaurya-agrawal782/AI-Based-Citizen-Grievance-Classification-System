const fs = require('fs');
const path = require('path');
const { runBenchmark } = require('../services/ai/benchmarkEngine');

const executeBenchmark = async () => {
  console.log('🚀 Starting AI Intelligence Benchmark Suite...');
  console.log('Analyzing 120 mock grievance samples (English, Hindi, Hinglish)...');
  console.log('Please wait, this may take a few seconds...\n');

  try {
    const results = await runBenchmark();

    console.log('=============================================');
    console.log('📊 AI BENCHMARK RESULTS');
    console.log('=============================================');
    console.log(`Total Samples Processed : ${results.totalSamples}`);
    console.log(`Category Accuracy       : ${results.categoryAccuracy.toFixed(2)}%`);
    console.log(`Priority Accuracy       : ${results.priorityAccuracy.toFixed(2)}%`);
    console.log(`Critical Case Recall    : ${results.criticalRecall.toFixed(2)}%`);
    console.log(`Human Review Rate       : ${results.humanReviewRate.toFixed(2)}%`);
    console.log(`Average Confidence      : ${results.averageConfidence.toFixed(2)}%`);
    console.log(`Average Latency         : ${results.averageLatencyMs.toFixed(2)} ms/req`);
    console.log('=============================================\n');

    const resultPath = path.join(__dirname, '../data/benchmarkResults.json');
    fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));

    console.log(`✅ Detailed results saved to: ${resultPath}`);
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
  }
};

executeBenchmark();
