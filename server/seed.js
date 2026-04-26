const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Grievance = require('./models/Grievance');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Grievance.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      name: 'Admin Officer',
      email: 'admin@civictrust.gov',
      password: 'admin123',
      phone: '9876543210',
      role: 'admin'
    });

    // Create department users
    const deptUsers = await User.create([
      { name: 'Rajesh Kumar', email: 'publicworks@civictrust.gov', password: 'dept123', role: 'department', department: 'Public Works' },
      { name: 'Priya Sharma', email: 'sanitation@civictrust.gov', password: 'dept123', role: 'department', department: 'Sanitation' },
      { name: 'Amit Patel', email: 'water@civictrust.gov', password: 'dept123', role: 'department', department: 'Water Authority' }
    ]);

    // Create citizen users
    const citizens = await User.create([
      { name: 'Jane Doe', email: 'jane@example.com', password: 'citizen123', phone: '9123456780', role: 'citizen' },
      { name: 'Rahul Verma', email: 'rahul@example.com', password: 'citizen123', phone: '9123456781', role: 'citizen' },
      { name: 'Sneha Gupta', email: 'sneha@example.com', password: 'citizen123', phone: '9123456782', role: 'citizen' }
    ]);

    console.log('Created users');

    // Create sample grievances
    const grievances = [
      {
        trackingId: 'GRV-9921',
        title: 'Infrastructure Collapse Hazard: Main St. Bridge',
        description: 'Multiple citizens reporting severe structural cracking and visible damage on the Main Street Bridge overpass. The cracks have been widening over the past two weeks, and debris has started falling on the road below. This poses an immediate danger to commuters. Urgent structural assessment is needed before a major collapse occurs.',
        category: 'Public Infrastructure',
        department: 'Public Works',
        priority: 'high',
        status: 'escalated',
        location: { address: 'Main Street Bridge, District 4', coordinates: { lat: 28.6139, lng: 77.2090 } },
        dateOfIncident: new Date('2026-04-22'),
        citizen: citizens[0]._id,
        citizenName: 'Jane Doe',
        citizenEmail: 'jane@example.com',
        citizenPhone: '9123456780',
        aiClassification: {
          suggestedDepartment: 'Public Works',
          confidence: 94,
          alternatives: [{ department: 'Municipal Safety', confidence: 42 }],
          summary: 'Citizen reports critical infrastructure damage on Main St. Bridge with structural cracking and falling debris. Issue is escalating and marked as high priority. Immediate structural assessment recommended.'
        },
        timeline: [
          { status: 'submitted', note: 'Grievance submitted by citizen', timestamp: new Date('2026-04-22T10:30:00') },
          { status: 'in-review', note: 'AI classified as Critical Infrastructure', timestamp: new Date('2026-04-22T10:30:02') },
          { status: 'escalated', note: 'Escalated due to public safety risk', timestamp: new Date('2026-04-22T11:00:00') }
        ]
      },
      {
        trackingId: 'GRV-9918',
        title: 'Water Main Break: Oakwood District',
        description: 'Large volume of water pooling at intersection of 4th Avenue and Oak Street. The water has been flowing for several hours and is starting to flood the lower-lying residential areas. Multiple households have reported loss of water pressure. Pipeline appears to be severely damaged.',
        category: 'Water Supply',
        department: 'Water Authority',
        priority: 'high',
        status: 'in-review',
        location: { address: '4th Ave & Oak Street, Oakwood District', coordinates: { lat: 28.6200, lng: 77.2150 } },
        dateOfIncident: new Date('2026-04-23'),
        citizen: citizens[1]._id,
        citizenName: 'Rahul Verma',
        citizenEmail: 'rahul@example.com',
        citizenPhone: '9123456781',
        aiClassification: {
          suggestedDepartment: 'Water Authority',
          confidence: 91,
          alternatives: [{ department: 'Public Works', confidence: 35 }],
          summary: 'Citizen reports major water main break in Oakwood District causing flooding and loss of water pressure to multiple households.'
        },
        timeline: [
          { status: 'submitted', note: 'Grievance submitted by citizen', timestamp: new Date('2026-04-23T14:00:00') },
          { status: 'in-review', note: 'Assigned to Water Authority', timestamp: new Date('2026-04-23T14:05:00') }
        ]
      },
      {
        trackingId: 'GRV-9915',
        title: 'Fallen Tree Blocking Sidewalk',
        description: 'Large oak limb fell during recent storm, completely blocking the pedestrian sidewalk along Green Park Avenue. The fallen branch is also partially blocking one lane of traffic. No injuries reported but it poses a hazard for pedestrians who have to walk on the road.',
        category: 'Public Infrastructure',
        department: 'Public Works',
        priority: 'medium',
        status: 'submitted',
        location: { address: 'Green Park Avenue, Sector 12', coordinates: { lat: 28.6100, lng: 77.2200 } },
        dateOfIncident: new Date('2026-04-24'),
        citizen: citizens[0]._id,
        citizenName: 'Jane Doe',
        citizenEmail: 'jane@example.com',
        aiClassification: {
          suggestedDepartment: 'Public Works',
          confidence: 78,
          alternatives: [{ department: 'Municipal Safety', confidence: 55 }],
          summary: 'Citizen reports fallen tree branch blocking sidewalk and partially road on Green Park Avenue after storm.'
        },
        timeline: [
          { status: 'submitted', note: 'Grievance submitted by citizen', timestamp: new Date('2026-04-24T08:00:00') }
        ]
      },
      {
        trackingId: 'GRV-9910',
        title: 'Severe Pothole Cluster on Elm Street',
        description: 'There is a massive cluster of deep potholes spanning the entire right lane on Elm Street, right before the intersection with 4th Avenue. It has been getting progressively worse over the last month, but after the recent heavy rain, they are now deep enough to cause significant damage to vehicles. I have personally seen two cars pull over with flat tires in the last week alone. It is becoming a serious safety hazard, especially at night when visibility is low. Please address this urgently before there is a major accident.',
        category: 'Public Infrastructure',
        department: 'Public Works',
        priority: 'high',
        status: 'in-review',
        location: { address: 'Elm St & 4th Ave', coordinates: { lat: 40.7128, lng: -74.0060 } },
        dateOfIncident: new Date('2026-04-20'),
        citizen: citizens[0]._id,
        citizenName: 'Jane Doe',
        citizenEmail: 'jane@example.com',
        aiClassification: {
          suggestedDepartment: 'Public Works',
          confidence: 94,
          alternatives: [{ department: 'Municipal Safety', confidence: 30 }],
          summary: 'Citizen reports a severe and expanding pothole cluster on Elm Street near 4th Avenue, citing recent vehicle damage and safety hazards. The issue is marked as escalating due to recent weather conditions. Immediate structural assessment recommended.'
        },
        timeline: [
          { status: 'submitted', note: 'Grievance submitted by citizen', timestamp: new Date('2026-04-20T09:00:00') },
          { status: 'in-review', note: 'Under review by Public Works', timestamp: new Date('2026-04-20T10:30:00') }
        ]
      },
      {
        trackingId: 'GRV-9905',
        title: 'Garbage Overflow Near Market Area',
        description: 'The garbage bins near the Sector 5 market area have been overflowing for the past 3 days. The waste is spilling onto the road and creating a foul smell. Stray animals are scattering the garbage everywhere. This is a recurring problem that needs a permanent solution.',
        category: 'Sanitation & Waste',
        department: 'Sanitation',
        priority: 'medium',
        status: 'in-progress',
        location: { address: 'Sector 5 Market, Main Road', coordinates: { lat: 28.6300, lng: 77.2100 } },
        dateOfIncident: new Date('2026-04-19'),
        citizen: citizens[2]._id,
        citizenName: 'Sneha Gupta',
        citizenEmail: 'sneha@example.com',
        aiClassification: {
          suggestedDepartment: 'Sanitation',
          confidence: 96,
          alternatives: [{ department: 'Municipal Safety', confidence: 20 }],
          summary: 'Recurring garbage overflow issue near Sector 5 market causing hygiene concerns and pest problems.'
        },
        timeline: [
          { status: 'submitted', note: 'Grievance submitted by citizen', timestamp: new Date('2026-04-19T07:00:00') },
          { status: 'in-review', note: 'Assigned to Sanitation department', timestamp: new Date('2026-04-19T08:00:00') },
          { status: 'in-progress', note: 'Sanitation team dispatched', timestamp: new Date('2026-04-19T10:00:00') }
        ]
      },
      {
        trackingId: 'GRV-9900',
        title: 'Streetlights Not Working on Ring Road',
        description: 'Multiple streetlights are not functioning on the Ring Road stretch between Sector 10 and Sector 14. This has been going on for over two weeks. The dark stretch has caused two minor accidents. Please fix the electricity board issue urgently.',
        category: 'Electricity',
        department: 'Electricity Board',
        priority: 'medium',
        status: 'in-progress',
        location: { address: 'Ring Road, Sector 10-14', coordinates: { lat: 28.6350, lng: 77.2250 } },
        dateOfIncident: new Date('2026-04-15'),
        citizen: citizens[1]._id,
        citizenName: 'Rahul Verma',
        citizenEmail: 'rahul@example.com',
        aiClassification: {
          suggestedDepartment: 'Electricity Board',
          confidence: 92,
          alternatives: [{ department: 'Municipal Safety', confidence: 25 }],
          summary: 'Multiple non-functional streetlights on Ring Road causing safety hazards and accidents.'
        },
        timeline: [
          { status: 'submitted', note: 'Grievance submitted', timestamp: new Date('2026-04-15T18:00:00') },
          { status: 'in-review', note: 'Assigned to Electricity Board', timestamp: new Date('2026-04-16T09:00:00') },
          { status: 'in-progress', note: 'Inspection team sent', timestamp: new Date('2026-04-17T11:00:00') }
        ]
      },
      {
        trackingId: 'GRV-9895',
        title: 'Open Manhole on Residential Street',
        description: 'An open manhole cover has been missing on Street No. 7 in Sector 3 residential area. This is extremely dangerous especially for children playing in the area. The manhole is right in the middle of the walking path. Please cover it immediately.',
        category: 'Public Safety',
        department: 'Municipal Safety',
        priority: 'high',
        status: 'resolved',
        location: { address: 'Street No. 7, Sector 3', coordinates: { lat: 28.6250, lng: 77.2050 } },
        dateOfIncident: new Date('2026-04-10'),
        citizen: citizens[2]._id,
        citizenName: 'Sneha Gupta',
        citizenEmail: 'sneha@example.com',
        aiClassification: {
          suggestedDepartment: 'Municipal Safety',
          confidence: 88,
          alternatives: [{ department: 'Public Works', confidence: 40 }],
          summary: 'Dangerous open manhole in residential area posing safety risk to pedestrians and children.'
        },
        feedback: {
          rating: 5,
          comment: 'The manhole was covered within 24 hours. Thank you for the quick response!',
          submittedAt: new Date('2026-04-12')
        },
        timeline: [
          { status: 'submitted', note: 'Grievance submitted', timestamp: new Date('2026-04-10T16:00:00') },
          { status: 'in-review', note: 'Marked as high priority', timestamp: new Date('2026-04-10T16:05:00') },
          { status: 'in-progress', note: 'Municipal safety team dispatched', timestamp: new Date('2026-04-10T17:00:00') },
          { status: 'resolved', note: 'Manhole cover replaced and secured', timestamp: new Date('2026-04-11T10:00:00') },
          { status: 'closed', note: 'Closed after positive citizen feedback', timestamp: new Date('2026-04-12T09:00:00') }
        ]
      },
      {
        trackingId: 'GRV-9890',
        title: 'Blocked Drain Causing Waterlogging',
        description: 'The main storm drain near Sector 8 crossing has been blocked for weeks, causing severe waterlogging even during light rain. The stagnant water is breeding mosquitoes and creating a health hazard for nearby residents.',
        category: 'Sanitation & Waste',
        department: 'Sanitation',
        priority: 'medium',
        status: 'in-review',
        location: { address: 'Sector 8 Crossing', coordinates: { lat: 28.6180, lng: 77.2120 } },
        dateOfIncident: new Date('2026-04-18'),
        citizen: citizens[1]._id,
        citizenName: 'Rahul Verma',
        citizenEmail: 'rahul@example.com',
        aiClassification: {
          suggestedDepartment: 'Sanitation',
          confidence: 85,
          alternatives: [{ department: 'Water Authority', confidence: 45 }],
          summary: 'Blocked storm drain causing waterlogging and mosquito breeding near Sector 8 crossing.'
        },
        timeline: [
          { status: 'submitted', note: 'Grievance submitted', timestamp: new Date('2026-04-18T12:00:00') },
          { status: 'in-review', note: 'Under assessment by Sanitation', timestamp: new Date('2026-04-18T14:00:00') }
        ]
      }
    ];

    await Grievance.insertMany(grievances);
    console.log(`Created ${grievances.length} sample grievances`);

    console.log('\n--- Login Credentials ---');
    console.log('Admin:   admin@civictrust.gov / admin123');
    console.log('Citizen: jane@example.com / citizen123');
    console.log('Citizen: rahul@example.com / citizen123');
    console.log('-------------------------\n');

    await mongoose.disconnect();
    console.log('✅ Seed complete!');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
