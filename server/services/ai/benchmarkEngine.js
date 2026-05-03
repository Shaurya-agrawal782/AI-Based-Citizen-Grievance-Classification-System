const fs = require('fs');
const path = require('path');
const { analyzeGrievanceIntelligently } = require('./index');

const loadBenchmarkData = () => {
  const filePath = path.join(__dirname, '../../data/grievanceBenchmark.json');
  if (!fs.existsSync(filePath)) {
    throw new Error('Benchmark data not found. Please run the generation script first.');
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const runBenchmark = async () => {
  const dataset = loadBenchmarkData();
  const totalSamples = dataset.length;
  let correctCategory = 0;
  let correctPriority = 0;
  let expectedCriticalCount = 0;
  let correctlyPredictedCritical = 0;
  let requiresHumanReviewCount = 0;
  let totalConfidence = 0;
  let totalLatency = 0;

  const languageBreakdown = {};
  const categoryBreakdown = {};
  const failedCases = [];

  for (let i = 0; i < totalSamples; i++) {
    const item = dataset[i];
    const startTime = Date.now();

    try {
      const result = await analyzeGrievanceIntelligently({
        title: item.title,
        description: item.description,
        location: item.location,
        locationContext: item.locationContext
      });

      const latency = Date.now() - startTime;
      totalLatency += latency;

      // Update confidence
      totalConfidence += (result.confidence || 0);

      if (result.requiresHumanReview) {
        requiresHumanReviewCount++;
      }

      // Check Category
      const isCategoryMatch = result.category === item.expectedCategory ||
                              (item.expectedCategory === 'Other' && result.category === 'Other');
      if (isCategoryMatch) {
        correctCategory++;
      }

      // Check Priority
      const isPriorityMatch = result.priority === item.expectedPriority;
      if (isPriorityMatch) {
        correctPriority++;
      }

      // Check Critical Recall
      if (item.isCritical) {
        expectedCriticalCount++;
        if (result.priority === 'Critical') {
          correctlyPredictedCritical++;
        }
      }

      // Language Breakdown
      if (!languageBreakdown[item.language]) {
        languageBreakdown[item.language] = { total: 0, correctCategory: 0 };
      }
      languageBreakdown[item.language].total++;
      if (isCategoryMatch) languageBreakdown[item.language].correctCategory++;

      // Category Breakdown
      if (!categoryBreakdown[item.expectedCategory]) {
        categoryBreakdown[item.expectedCategory] = { total: 0, correctCategory: 0 };
      }
      categoryBreakdown[item.expectedCategory].total++;
      if (isCategoryMatch) categoryBreakdown[item.expectedCategory].correctCategory++;

      // Log failures
      if ((!isCategoryMatch || !isPriorityMatch) && failedCases.length < 15) {
        failedCases.push({
          id: item.id,
          title: item.title,
          language: item.language,
          expectedCategory: item.expectedCategory,
          predictedCategory: result.category,
          expectedPriority: item.expectedPriority,
          predictedPriority: result.priority,
          latency
        });
      }

    } catch (error) {
      console.error(`Error processing item ${item.id}:`, error);
      if (failedCases.length < 15) {
        failedCases.push({
          id: item.id,
          error: error.message
        });
      }
    }
  }

  // Calculate final metrics
  const metrics = {
    totalSamples,
    categoryAccuracy: (correctCategory / totalSamples) * 100,
    priorityAccuracy: (correctPriority / totalSamples) * 100,
    criticalRecall: expectedCriticalCount > 0 ? (correctlyPredictedCritical / expectedCriticalCount) * 100 : 100,
    humanReviewRate: (requiresHumanReviewCount / totalSamples) * 100,
    averageConfidence: totalConfidence / totalSamples,
    averageLatencyMs: totalLatency / totalSamples,
    languageBreakdown,
    categoryBreakdown,
    failedCases
  };

  return metrics;
};

module.exports = { runBenchmark };
