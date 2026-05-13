const fs = require('fs');

const newEnKeys = `
    admin: {
      dashboardTitle: "Admin Dashboard",
      commandCenter: "Command Center",
      activeTickets: "Active Tickets",
      resolvedTickets: "Resolved Tickets",
      escalated: "Escalated",
      avgResolutionTime: "Avg. Resolution Time",
      hours: "hours",
      liveQueue: "Live Grievance Queue",
      viewDetails: "View Details",
      mapView: "Geospatial View",
      analytics: "System Analytics",
      taxonomy: "Taxonomy Studio",
      refresh: "Refresh",
      assignOfficer: "Assign Officer",
      updateStatus: "Update Status",
    },
    demo: {
      title: "Demo Mode & Winning Pitch",
      subtitle: "Experience CivicTrust AI from multiple perspectives and view our pitch.",
      pitchTitle: "Winning Pitch",
      playPitch: "Play Pitch",
      architecture: "Technical Architecture",
      resetDemo: "Reset Demo Data",
      generateMock: "Generate Mock Tickets",
      ivrSimulator: "IVR Simulator",
      whatsappSimulator: "WhatsApp Simulator",
    },
    copilot: {
      title: "CivicDraft AI",
      subtitle: "Convert your rough complaint into a formal government application.",
      inputPlaceholder: "Type your complaint in rough language...",
      generate: "Generate Formal Draft",
      confidenceScore: "Confidence Score",
      formalDraft: "Formal Draft",
      useThisDraft: "Use This Draft",
    },
`;

const newHiKeys = `
    admin: {
      dashboardTitle: "एडमिन डैशबोर्ड",
      commandCenter: "कमांड सेंटर",
      activeTickets: "सक्रिय टिकट",
      resolvedTickets: "हल किए गए टिकट",
      escalated: "एस्केलेटेड",
      avgResolutionTime: "औसत समाधान समय",
      hours: "घंटे",
      liveQueue: "लाइव शिकायत कतार",
      viewDetails: "विवरण देखें",
      mapView: "भौगोलिक दृश्य",
      analytics: "सिस्टम विश्लेषण",
      taxonomy: "टैक्सोनॉमी स्टूडियो",
      refresh: "रीफ्रेश करें",
      assignOfficer: "अधिकारी नियुक्त करें",
      updateStatus: "स्थिति अपडेट करें",
    },
    demo: {
      title: "डेमो मोड और पिच",
      subtitle: "CivicTrust AI का अनुभव करें और हमारी पिच देखें।",
      pitchTitle: "विनिंग पिच",
      playPitch: "पिच चलाएं",
      architecture: "तकनीकी वास्तुकला",
      resetDemo: "डेमो डेटा रीसेट करें",
      generateMock: "मॉक टिकट बनाएं",
      ivrSimulator: "IVR सिम्युलेटर",
      whatsappSimulator: "WhatsApp सिम्युलेटर",
    },
    copilot: {
      title: "CivicDraft AI",
      subtitle: "अपनी कच्ची शिकायत को एक औपचारिक सरकारी आवेदन में बदलें।",
      inputPlaceholder: "अपनी शिकायत रफ भाषा में टाइप करें...",
      generate: "औपचारिक ड्राफ्ट बनाएं",
      confidenceScore: "विश्वास स्कोर",
      formalDraft: "औपचारिक ड्राफ्ट",
      useThisDraft: "इस ड्राफ्ट का उपयोग करें",
    },
`;

let content = fs.readFileSync('client/src/i18n/translations.js', 'utf8');

if (!content.includes('dashboardTitle: "Admin Dashboard"')) {
  // Insert newEnKeys before the end of 'en' object
  let enEndIdx = content.indexOf('hi: {') - 5;
  content = content.substring(0, enEndIdx) + newEnKeys + content.substring(enEndIdx);
  
  // Insert newHiKeys before the end of 'hi' object
  let hiEndIdx = content.lastIndexOf('};') - 2;
  content = content.substring(0, hiEndIdx) + newHiKeys + content.substring(hiEndIdx);
  
  fs.writeFileSync('client/src/i18n/translations.js', content);
  console.log('Translations extended.');
} else {
  console.log('Translations already extended.');
}
