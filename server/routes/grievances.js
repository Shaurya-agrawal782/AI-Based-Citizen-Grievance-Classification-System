const express = require('express');
const Grievance = require('../models/Grievance');
const { auth, requireRole } = require('../middleware/auth');
const { analyzeGrievance } = require('../utils/geminiAI');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const query = req.user.role === 'citizen' ? { citizen: req.userId } : {};
    
    const [total, submitted, inReview, inProgress, resolved, escalated, highPriority] = await Promise.all([
      Grievance.countDocuments(query),
      Grievance.countDocuments({ ...query, status: 'submitted' }),
      Grievance.countDocuments({ ...query, status: 'in-review' }),
      Grievance.countDocuments({ ...query, status: 'in-progress' }),
      Grievance.countDocuments({ ...query, status: { $in: ['resolved', 'closed'] } }),
      Grievance.countDocuments({ ...query, status: 'escalated' }),
      Grievance.countDocuments({ ...query, priority: 'high' })
    ]);

    const aiClassified = await Grievance.countDocuments({ 
      ...query, 
      'aiClassification.suggestedDepartment': { $ne: null } 
    });

    // Category distribution
    const categoryStats = await Grievance.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Priority distribution
    const priorityStats = await Grievance.aggregate([
      { $match: query },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyTrends = await Grievance.aggregate([
      { $match: { ...query, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Department performance
    const departmentStats = await Grievance.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      total,
      submitted,
      inReview,
      inProgress,
      resolved,
      escalated,
      highPriority,
      aiClassified,
      pendingReview: submitted + inReview,
      categoryStats,
      priorityStats,
      monthlyTrends,
      departmentStats,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new grievance
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, location, dateOfIncident, citizenPhone, coordinates } = req.body;

    // Advanced AI Analysis (Gemini)
    const aiResult = await analyzeGrievance(title, description);

    // Map category to department
    const categoryDeptMap = {
      'Public Infrastructure': 'Public Works',
      'Sanitation & Waste': 'Sanitation',
      'Water Supply': 'Water Authority',
      'Electricity': 'Electricity Board',
      'Public Safety': 'Municipal Safety'
    };

    // Use AI suggested department if category not provided or if confidence is very high
    const finalDepartment = aiResult.suggestedDepartment;
    const finalCategory = category || Object.keys(categoryDeptMap).find(
      k => categoryDeptMap[k] === aiResult.suggestedDepartment
    ) || 'Public Infrastructure';

    const grievance = new Grievance({
      title,
      description,
      category: finalCategory,
      department: finalDepartment,
      priority: aiResult.priority || 'medium',
      location: {
        address: location || '',
        coordinates: coordinates || { lat: 0, lng: 0 }
      },
      dateOfIncident: dateOfIncident || new Date(),
      citizen: req.userId,
      citizenName: req.user.name,
      citizenEmail: req.user.email,
      citizenPhone: citizenPhone || req.user.phone,
      aiClassification: aiResult
    });

    await grievance.save();

    res.status(201).json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all grievances (filtered by role)
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, category, department, page = 1, limit = 20, search } = req.query;
    
    let query = {};
    
    // Citizens only see their own grievances
    if (req.user.role === 'citizen') {
      query.citizen = req.userId;
    }
    
    // Department users see only their department's grievances
    if (req.user.role === 'department' && req.user.department) {
      query.department = req.user.department;
    }

    // Filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (department) query.department = department;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { trackingId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [grievances, total] = await Promise.all([
      Grievance.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('citizen', 'name email'),
      Grievance.countDocuments(query)
    ]);

    res.json({
      grievances,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single grievance
router.get('/:id', auth, async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id)
      .populate('citizen', 'name email phone');
    
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    // Citizens can only view their own
    if (req.user.role === 'citizen' && grievance.citizen._id.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Track grievance by tracking ID (public-ish - needs auth but any citizen can track)
router.get('/track/:trackingId', auth, async (req, res) => {
  try {
    const grievance = await Grievance.findOne({ trackingId: req.params.trackingId })
      .select('trackingId title category department priority status timeline createdAt updatedAt');
    
    if (!grievance) {
      return res.status(404).json({ error: 'No grievance found with this tracking ID' });
    }

    res.json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update grievance status (admin/department only)
router.patch('/:id/status', auth, requireRole('admin', 'department'), async (req, res) => {
  try {
    const { status, note } = req.body;
    const grievance = await Grievance.findById(req.params.id);
    
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    grievance.status = status;
    grievance.timeline.push({
      status,
      note: note || `Status updated to ${status}`,
      timestamp: new Date(),
      updatedBy: req.userId
    });

    await grievance.save();
    res.json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign grievance to department (admin only)
router.patch('/:id/assign', auth, requireRole('admin'), async (req, res) => {
  try {
    const { department } = req.body;
    const grievance = await Grievance.findById(req.params.id);
    
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    grievance.department = department;
    grievance.status = 'in-review';
    grievance.timeline.push({
      status: 'in-review',
      note: `Assigned to ${department} department`,
      timestamp: new Date(),
      updatedBy: req.userId
    });

    await grievance.save();
    res.json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit feedback (citizen only)
router.post('/:id/feedback', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const grievance = await Grievance.findById(req.params.id);
    
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    if (grievance.citizen.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only the filing citizen can provide feedback' });
    }

    grievance.feedback = {
      rating,
      comment,
      submittedAt: new Date()
    };

    if (rating >= 4) {
      grievance.status = 'closed';
      grievance.timeline.push({
        status: 'closed',
        note: 'Complaint closed after positive citizen feedback',
        timestamp: new Date()
      });
    } else if (rating <= 2) {
      grievance.status = 'reopened';
      grievance.timeline.push({
        status: 'reopened',
        note: 'Complaint reopened due to unsatisfactory resolution',
        timestamp: new Date()
      });
    }

    await grievance.save();
    res.json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Escalate grievance (admin only)
router.patch('/:id/escalate', auth, requireRole('admin'), async (req, res) => {
  try {
    const { note } = req.body;
    const grievance = await Grievance.findById(req.params.id);
    
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    grievance.status = 'escalated';
    grievance.priority = 'high';
    grievance.timeline.push({
      status: 'escalated',
      note: note || 'Escalated to higher authority for immediate action',
      timestamp: new Date(),
      updatedBy: req.userId
    });

    await grievance.save();
    res.json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manually reopen grievance (admin/department)
router.patch('/:id/reopen', auth, requireRole('admin', 'department'), async (req, res) => {
  try {
    const { note } = req.body;
    const grievance = await Grievance.findById(req.params.id);
    
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    grievance.status = 'reopened';
    grievance.timeline.push({
      status: 'reopened',
      note: note || 'Manually reopened for further investigation',
      timestamp: new Date(),
      updatedBy: req.userId
    });

    await grievance.save();
    res.json({ grievance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
