const express = require('express');
const TaxonomyCategory = require('../models/TaxonomyCategory');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/taxonomy — list all (admin can see inactive too; public sees active only)
router.get('/', auth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'department';
    const query = isAdmin ? {} : { isActive: true };
    const categories = await TaxonomyCategory.find(query).sort({ name: 1 });
    res.json({ categories, total: categories.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/taxonomy/:id — single entry
router.get('/:id', auth, requireRole('admin', 'department'), async (req, res) => {
  try {
    const category = await TaxonomyCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Taxonomy category not found' });
    res.json({ category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/taxonomy — create
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user.name || req.userId, updatedBy: req.user.name || req.userId };

    // Normalise synonyms/examples if sent as string
    if (typeof data.synonyms === 'string') data.synonyms = data.synonyms.split(',').map(s => s.trim()).filter(Boolean);
    if (typeof data.examples === 'string') data.examples = data.examples.split(',').map(s => s.trim()).filter(Boolean);

    const category = new TaxonomyCategory(data);
    await category.save();
    res.status(201).json({ category });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'A category with this name or slug already exists.' });
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/taxonomy/:id — full update
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const data = { ...req.body, updatedBy: req.user.name || req.userId };
    if (typeof data.synonyms === 'string') data.synonyms = data.synonyms.split(',').map(s => s.trim()).filter(Boolean);
    if (typeof data.examples === 'string') data.examples = data.examples.split(',').map(s => s.trim()).filter(Boolean);

    const category = await TaxonomyCategory.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ error: 'Taxonomy category not found' });
    res.json({ category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/taxonomy/:id/toggle — flip isActive
router.patch('/:id/toggle', auth, requireRole('admin'), async (req, res) => {
  try {
    const category = await TaxonomyCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Taxonomy category not found' });
    category.isActive = !category.isActive;
    category.updatedBy = req.user.name || req.userId;
    await category.save();
    res.json({ category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/taxonomy/:id
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const category = await TaxonomyCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: 'Taxonomy category not found' });
    res.json({ message: 'Taxonomy category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
