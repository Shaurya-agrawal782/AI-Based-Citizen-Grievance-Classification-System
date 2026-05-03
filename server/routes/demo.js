const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const getDemoData = () => {
  const filePath = path.join(__dirname, '../data/demoScenario.json');
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return null;
};

// GET /api/demo/scenario - Full demo scenario
router.get('/scenario', (req, res) => {
  try {
    const data = getDemoData();
    if (!data) return res.status(404).json({ error: 'Demo data not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/demo/ai-analysis
router.get('/ai-analysis', (req, res) => {
  try {
    const data = getDemoData();
    if (!data) return res.status(404).json({ error: 'Demo data not found' });
    res.json({ aiAnalysis: data.demoAIAnalysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/demo/benchmark-summary
router.get('/benchmark-summary', (req, res) => {
  try {
    const data = getDemoData();
    if (!data) return res.status(404).json({ error: 'Demo data not found' });
    res.json({ benchmarkSummary: data.demoBenchmarkSummary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
