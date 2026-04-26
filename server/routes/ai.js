const express = require('express');
const Grievance = require('../models/Grievance');
const { auth, requireRole } = require('../middleware/auth');
const { analyzeGrievance, generateOfficialResponse } = require('../utils/geminiAI');
const { checkDuplicate } = require('../utils/aiClassifier');

const router = express.Router();

// Classify grievance text (real-time as user types)
router.post('/classify', auth, async (req, res) => {
  try {
    const { title, description, images } = req.body;

    if (!title && !description) {
      return res.status(400).json({ error: 'Please provide title or description' });
    }

    const analysis = await analyzeGrievance(title || '', description || '', images || []);

    res.json({
      ...analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check for duplicate grievances
router.post('/check-duplicate', auth, async (req, res) => {
  try {
    const { title, description } = req.body;

    // Get recent grievances for comparison
    const recentGrievances = await Grievance.find({
      status: { $nin: ['closed', 'resolved'] }
    })
    .select('trackingId title description status')
    .sort({ createdAt: -1 })
    .limit(100);

    const result = checkDuplicate(title || '', description || '', recentGrievances);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate draft response for official
router.post('/generate-response', auth, requireRole('admin', 'department'), async (req, res) => {
  try {
    const { grievanceId, context } = req.body;
    const grievance = await Grievance.findById(grievanceId);
    
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    const draft = await generateOfficialResponse(grievance, context);
    res.json({ draft });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
