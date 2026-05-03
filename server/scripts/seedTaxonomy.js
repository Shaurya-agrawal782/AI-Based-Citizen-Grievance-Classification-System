const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const TaxonomyCategory = require('../models/TaxonomyCategory');

const seeds = [
  {
    name: 'Electricity',
    slug: 'electricity',
    department: 'Electricity Board',
    description: 'Issues related to power supply, electrical infrastructure, and safety.',
    synonyms: ['bijli', 'power', 'electricity', 'transformer', 'wire', 'pole', 'spark', 'current', 'light', 'voltage', 'outage'],
    examples: ['pole sparking near school', 'transformer blast', 'power cut for 2 days', 'exposed wire on road'],
    priorityRules: {
      defaultPriority: 'Normal',
      criticalKeywords: ['spark', 'blast', 'fire', 'exposed wire', 'electrocution', 'transformer', 'short circuit'],
      urgentKeywords: ['power cut', 'outage', 'no electricity', 'bijli nahi', 'no power'],
      normalKeywords: ['streetlight', 'billing', 'meter', 'connection', 'light not working']
    },
    slaRules: { criticalHours: 4, urgentHours: 12, normalHours: 72 },
    escalationRules: {
      criticalEscalation: 'Chief Electrical Engineer',
      urgentEscalation: 'Division Electrical Officer',
      normalEscalation: 'Ward Electrical Supervisor'
    },
    isActive: true,
    createdBy: 'system'
  },
  {
    name: 'Water Supply',
    slug: 'water-supply',
    department: 'Water Authority',
    description: 'Issues related to drinking water supply, pipelines, and water quality.',
    synonyms: ['pani', 'water', 'tap', 'pipeline', 'leakage', 'supply', 'contaminated', 'dirty water', 'nahi aa raha', 'not coming'],
    examples: ['no water supply for 3 days', 'dirty water from tap', 'pipeline leakage on main road', 'contaminated water making people sick'],
    priorityRules: {
      defaultPriority: 'Normal',
      criticalKeywords: ['contaminated', 'poisonous', 'chemicals', 'disease', 'sick', 'ill', 'kaala pani', 'black water'],
      urgentKeywords: ['no water', 'supply band', 'pani nahi', 'leakage', 'burst pipe', 'road flooded'],
      normalKeywords: ['low pressure', 'irregular supply', 'meter issue', 'billing', 'connection']
    },
    slaRules: { criticalHours: 4, urgentHours: 24, normalHours: 72 },
    escalationRules: {
      criticalEscalation: 'Chief Water Engineer',
      urgentEscalation: 'Zonal Water Officer',
      normalEscalation: 'Ward Water Supervisor'
    },
    isActive: true,
    createdBy: 'system'
  },
  {
    name: 'Sanitation',
    slug: 'sanitation',
    department: 'Sanitation Department',
    description: 'Issues with garbage collection, drain cleaning, sewage, and public hygiene.',
    synonyms: ['kachra', 'garbage', 'waste', 'gandagi', 'drain', 'nala', 'sewage', 'cleaning', 'safai', 'dirty', 'mosquitoes', 'rats'],
    examples: ['garbage not collected for a week', 'drain overflow flooding street', 'sewage smell from open drain', 'mosquito breeding in stagnant water'],
    priorityRules: {
      defaultPriority: 'Normal',
      criticalKeywords: ['sewage flood', 'overflow into houses', 'epidemic', 'disease spread', 'hospital', 'school'],
      urgentKeywords: ['drain overflow', 'nala overflow', 'garbage pile', 'kachra jama', 'sewage smell', 'rats'],
      normalKeywords: ['not collected', 'schedule missed', 'bin full', 'dustbin', 'sweeping']
    },
    slaRules: { criticalHours: 4, urgentHours: 24, normalHours: 72 },
    escalationRules: {
      criticalEscalation: 'Chief Sanitation Officer',
      urgentEscalation: 'Zonal Sanitation Officer',
      normalEscalation: 'Ward Sanitation Supervisor'
    },
    isActive: true,
    createdBy: 'system'
  },
  {
    name: 'Roads',
    slug: 'roads',
    department: 'Public Works Department',
    description: 'Issues related to road conditions, potholes, bridges, footpaths, and traffic.',
    synonyms: ['road', 'sadak', 'pothole', 'gaddha', 'bridge', 'footpath', 'traffic', 'waterlogging', 'pavement', 'divider'],
    examples: ['large pothole causing accidents', 'bridge crack spotted', 'road waterlogging after rain', 'footpath broken'],
    priorityRules: {
      defaultPriority: 'Normal',
      criticalKeywords: ['bridge crack', 'collapse', 'flyover', 'accident', 'injury', 'road closed'],
      urgentKeywords: ['deep pothole', 'large gaddha', 'waterlogging', 'road broken', 'divider broken', 'accident risk'],
      normalKeywords: ['pothole', 'patch', 'repair needed', 'footpath', 'signage', 'marking']
    },
    slaRules: { criticalHours: 4, urgentHours: 24, normalHours: 72 },
    escalationRules: {
      criticalEscalation: 'Chief Engineer PWD',
      urgentEscalation: 'Divisional Engineer',
      normalEscalation: 'Ward Engineer'
    },
    isActive: true,
    createdBy: 'system'
  },
  {
    name: 'Public Safety',
    slug: 'public-safety',
    department: 'Municipal Safety',
    description: 'Immediate safety risks including fire, open manholes, structural collapse, and accidents.',
    synonyms: ['danger', 'fire', 'accident', 'injury', 'collapse', 'open manhole', 'school', 'hospital', 'emergency', 'unsafe', 'hazard'],
    examples: ['open manhole without cover on main road', 'building collapse near hospital', 'fire in market area', 'accident-prone road near school'],
    priorityRules: {
      defaultPriority: 'Urgent',
      criticalKeywords: ['fire', 'collapse', 'blast', 'explosion', 'flood', 'trapped', 'injury', 'death', 'school', 'hospital'],
      urgentKeywords: ['open manhole', 'unsafe building', 'accident', 'broken railing', 'electrical hazard', 'danger'],
      normalKeywords: ['street safety', 'lighting needed', 'cctv', 'speed breaker', 'warning sign']
    },
    slaRules: { criticalHours: 2, urgentHours: 8, normalHours: 48 },
    escalationRules: {
      criticalEscalation: 'Municipal Commissioner',
      urgentEscalation: 'Deputy Commissioner',
      normalEscalation: 'Zonal Safety Officer'
    },
    isActive: true,
    createdBy: 'system'
  },
  {
    name: 'Other',
    slug: 'other',
    department: 'General Administration',
    description: 'Complaints that are unclear, incomplete, or do not fit standard categories. Requires manual review.',
    synonyms: ['unclear', 'unknown', 'incomplete', 'review', 'misc', 'general', 'other'],
    examples: ['hello', 'testing', 'I have a complaint', 'please help me'],
    priorityRules: {
      defaultPriority: 'Review',
      criticalKeywords: [],
      urgentKeywords: [],
      normalKeywords: []
    },
    slaRules: { criticalHours: 24, urgentHours: 48, normalHours: 120 },
    escalationRules: {
      criticalEscalation: 'General Administration Head',
      urgentEscalation: 'Triage Officer',
      normalEscalation: 'Helpdesk Supervisor'
    },
    isActive: true,
    createdBy: 'system'
  }
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    let created = 0, skipped = 0;
    for (const item of seeds) {
      const exists = await TaxonomyCategory.findOne({ slug: item.slug });
      if (exists) {
        console.log(`⏭️  Skipped (already exists): ${item.name}`);
        skipped++;
      } else {
        await TaxonomyCategory.create(item);
        console.log(`✅ Seeded: ${item.name}`);
        created++;
      }
    }

    console.log(`\n🌱 Seeding complete — Created: ${created}, Skipped: ${skipped}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

seed();
