const mongoose = require('mongoose');

const taxonomyCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  synonyms: {
    type: [String],
    default: []
  },
  examples: {
    type: [String],
    default: []
  },
  priorityRules: {
    defaultPriority: {
      type: String,
      enum: ['Critical', 'Urgent', 'Normal', 'Review'],
      default: 'Normal'
    },
    criticalKeywords: { type: [String], default: [] },
    urgentKeywords:   { type: [String], default: [] },
    normalKeywords:   { type: [String], default: [] }
  },
  slaRules: {
    criticalHours: { type: Number, default: 4 },
    urgentHours:   { type: Number, default: 24 },
    normalHours:   { type: Number, default: 72 }
  },
  escalationRules: {
    criticalEscalation: { type: String, default: 'Commissioner Office' },
    urgentEscalation:   { type: String, default: 'Zonal Officer' },
    normalEscalation:   { type: String, default: 'Ward Officer' }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    default: 'system'
  },
  updatedBy: {
    type: String,
    default: 'system'
  }
}, { timestamps: true });

// Auto-generate slug from name before save
taxonomyCategorySchema.pre('validate', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  next();
});

module.exports = mongoose.model('TaxonomyCategory', taxonomyCategorySchema);
