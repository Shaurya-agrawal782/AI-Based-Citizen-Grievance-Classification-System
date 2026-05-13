const mongoose = require('mongoose');

const timelineEntrySchema = new mongoose.Schema({
  status: String,
  timestamp: { type: Date, default: Date.now },
  note: String,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const grievanceSchema = new mongoose.Schema({
  trackingId: {
    type: String,
    unique: true,
    required: true
  },
  title: {
    type: String,
    required: [true, 'Grievance title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  category: {
    type: String,
    enum: ['Public Infrastructure', 'Sanitation & Waste', 'Water Supply', 'Electricity', 'Public Safety'],
    required: true
  },
  department: {
    type: String,
    enum: ['Public Works', 'Sanitation', 'Water Authority', 'Electricity Board', 'Municipal Safety'],
    default: null
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['submitted', 'in-review', 'in-progress', 'resolved', 'escalated', 'reopened', 'closed'],
    default: 'submitted'
  },
  location: {
    landmark: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    area: String,
    ward: String,
    zone: String,
    lat: Number,
    lng: Number,
    coordinates: {
      lat: Number,
      lng: Number
    },
    accuracy: Number,
    source: {
      type: String,
      enum: ['GPS', 'QR', 'Manual', 'IP'],
      default: 'Manual'
    },
    detectedAt: Date
  },
  locationSource: {
    type: String,
    enum: ['GPS', 'QR', 'Manual', 'IP'],
    default: 'Manual'
  },
  dateOfIncident: {
    type: Date
  },
  attachments: [{
    filename: String,
    path: String,
    mimetype: String
  }],
  citizen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  citizenName: String,
  citizenEmail: String,
  citizenPhone: String,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  aiClassification: {
    suggestedDepartment: String,
    confidence: Number,
    alternatives: [{
      department: String,
      confidence: Number
    }],
    summary: String,
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'urgent/angry'],
      default: 'neutral'
    },
    detectedLanguage: {
      type: String,
      default: 'English'
    },
    isUrgent: {
      type: Boolean,
      default: false
    },
    keyEntities: [String] // e.g., names of landmarks, specific people
  },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    submittedAt: Date
  },
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grievance',
    default: null
  },
  privacyConsent: {
    type: Boolean,
    default: false
  },
  privacyConsentAt: {
    type: Date,
    default: null
  },
  auditTrail: [{
    action: String,
    performedBy: {
      userId: String,
      name: String,
      role: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    reason: String,
    systemGenerated: {
      type: Boolean,
      default: false
    }
  }],
  caseHistory: [{
    status: String,
    note: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    actor: {
      name: String,
      role: String
    },
    visibility: {
      type: String,
      enum: ["internal", "citizen", "public"],
      default: "internal"
    }
  }],
  timeline: [timelineEntrySchema]
}, {
  timestamps: true
});

// Generate tracking ID before save
grievanceSchema.pre('validate', async function(next) {
  if (!this.trackingId) {
    const count = await mongoose.model('Grievance').countDocuments();
    this.trackingId = `GRV-${String(count + 1001).padStart(4, '0')}`;
  }
  next();
});

// Add initial timeline entry
grievanceSchema.pre('save', function(next) {
  if (this.isNew) {
    this.timeline.push({
      status: 'submitted',
      note: 'Grievance submitted by citizen',
      timestamp: new Date()
    });
  }
  next();
});

module.exports = mongoose.model('Grievance', grievanceSchema);
