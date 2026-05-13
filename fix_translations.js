const fs = require('fs');
let code = fs.readFileSync('client/src/i18n/translations.js', 'utf8');

// Fix the syntax error at line 219 (the rogue bracket)
code = code.replace(/    language: \{\s+switchLabel: "Language",\s+comingSoon: "Coming Soon",\s+regional: "Regional Languages",\s+\},\s+\}\s+admin: \{/g,
`    language: {
      switchLabel: "Language",
      comingSoon: "Coming Soon",
      regional: "Regional Languages",
    },
    admin: {`);

// Fix the syntax error in 'hi' around line 472
code = code.replace(/    language: \{\s+switchLabel: "भाषा",\s+comingSoon: "जल्द आ रहा है",\s+regional: "क्षेत्रीय भाषाएँ",\s+\},\s+\}\s+admin: \{/g,
`    language: {
      switchLabel: "भाषा",
      comingSoon: "जल्द आ रहा है",
      regional: "क्षेत्रीय भाषाएँ",
    },
    admin: {`);

// Fix the trailing comma issue around en block end
code = code.replace(/      useThisDraft: "Use This Draft",\s+\},\s+,\s+hi: \{/g,
`      useThisDraft: "Use This Draft",
    },
  },
  hi: {`);

// Fix the trailing comma issue around hi block end
code = code.replace(/      useThisDraft: "इस ड्राफ्ट का उपयोग करें",\s+\},\s+,\s+\};\s+\/\*\*/g,
`      useThisDraft: "इस ड्राफ्ट का उपयोग करें",
    },
  }
};

/**`);

const extraEn = `
    minor: {
      pitchTitleMinor: "60-Second Winning Pitch",
      pitchDesc: "Read this to the judges during the live demo.",
      pitchQuote: "\\"CivicTrust AI converts unstructured citizen complaints into actionable governance workflows. A citizen can speak in Hindi or Hinglish, the system detects language, classifies the issue, identifies safety-critical urgency, routes it to the correct ward officer, clusters duplicate reports, starts an SLA timer, and records every action for accountability. This is not just complaint registration; it is intelligent grievance redressal.\\"",
      intelligent: "intelligent grievance redressal",
      techDiff: "Technical Differentiators",
      hideDetails: "Hide Details",
      showArch: "Show Architecture",
      modAI: "Modular AI Layer",
      modAIDesc: "Decoupled architecture for Language, Classification, and Urgency.",
      polSLA: "Policy-Backed SLA",
      polSLADesc: "Deterministic SLA timers based on AI severity detection.",
      authRoute: "Authority Routing",
      authRouteDesc: "Dynamic mapping to Ward/Zone specific officers.",
      semCluster: "Semantic Clustering",
      semClusterDesc: "Groups duplicates to prevent redundant field dispatches.",
      adaptTax: "Adaptive Taxonomy",
      adaptTaxDesc: "Admins update rules/categories without deploying code.",
      privMask: "Privacy-First Masking",
      privMaskDesc: "Regex-based PII redaction before external AI processing.",
      qrReportTitle: "Report Issue in",
      qrReportSubtitle: "Scanned from verified poster at:",
      captureAudio: "Capture Audio",
      stopRecording: "Stop Recording",
      recording: "Recording...",
      processing: "Processing...",
    },`;

const extraHi = `
    minor: {
      pitchTitleMinor: "60-सेकंड की विनिंग पिच",
      pitchDesc: "लाइव डेमो के दौरान इसे जजों को पढ़कर सुनाएं।",
      pitchQuote: "\\"CivicTrust AI असंगठित नागरिक शिकायतों को कार्रवाई योग्य शासन कार्यप्रवाह में बदलता है। एक नागरिक हिंदी या हिंग्लिश में बोल सकता है, सिस्टम भाषा का पता लगाता है, मुद्दे को वर्गीकृत करता है, सुरक्षा-महत्वपूर्ण तात्कालिकता की पहचान करता है, इसे सही वार्ड अधिकारी को भेजता है, डुप्लिकेट रिपोर्ट को एक साथ करता है, SLA टाइमर शुरू करता है, और जवाबदेही के लिए हर कार्रवाई को रिकॉर्ड करता है। यह केवल शिकायत दर्ज करना नहीं है; यह बुद्धिमान शिकायत निवारण है।\\"",
      intelligent: "बुद्धिमान शिकायत निवारण",
      techDiff: "तकनीकी अंतर",
      hideDetails: "विवरण छिपाएं",
      showArch: "वास्तुकला दिखाएं",
      modAI: "मॉड्यूलर AI लेयर",
      modAIDesc: "भाषा, वर्गीकरण और तात्कालिकता के लिए डिकपल्ड आर्किटेक्चर।",
      polSLA: "पॉलिसी-समर्थित SLA",
      polSLADesc: "AI गंभीरता का पता लगाने के आधार पर नियतात्मक SLA टाइमर।",
      authRoute: "प्राधिकरण रूटिंग",
      authRouteDesc: "वार्ड/ज़ोन विशिष्ट अधिकारियों के लिए डायनामिक मैपिंग।",
      semCluster: "सिमेंटिक क्लस्टरिंग",
      semClusterDesc: "अनावश्यक फील्ड प्रेषण को रोकने के लिए डुप्लिकेट को समूहित करता है।",
      adaptTax: "अनुकूली वर्गीकरण",
      adaptTaxDesc: "एडमिन कोड परिनियोजित किए बिना नियम/श्रेणियां अपडेट करते हैं।",
      privMask: "गोपनीयता-प्रथम मास्किंग",
      privMaskDesc: "बाहरी AI प्रसंस्करण से पहले Regex-आधारित PII रिडक्शन।",
      qrReportTitle: "में समस्या रिपोर्ट करें",
      qrReportSubtitle: "सत्यापित पोस्टर से स्कैन किया गया:",
      captureAudio: "ऑडियो कैप्चर करें",
      stopRecording: "रिकॉर्डिंग रोकें",
      recording: "रिकॉर्ड हो रहा है...",
      processing: "प्रसंस्करण हो रहा है...",
    },`;

if (!code.includes('pitchTitleMinor')) {
  // Insert before the closing brace of 'en'
  code = code.replace(/    copilot: \{[\s\S]*?useThisDraft:[^\n]*\n\s*\},/g, match => match + extraEn);
  // Insert before the closing brace of 'hi'
  code = code.replace(/    copilot: \{[\s\S]*?useThisDraft:[^\n]*\n\s*\}/g, match => match + "," + extraHi);
}

fs.writeFileSync('client/src/i18n/translations.js', code);
console.log('Translations fixed and minor added.');

// One more fix: PitchScriptCard used minor.pitchTitle but it was demo.pitchTitle. Wait, I changed it to minor.pitchTitleMinor in my dictionary. Let me fix the component.
const pscFile = 'client/src/components/demo/PitchScriptCard.jsx';
if (fs.existsSync(pscFile)) {
  let pscCode = fs.readFileSync(pscFile, 'utf8');
  pscCode = pscCode.replace(/minor\.pitchTitle/g, 'minor.pitchTitleMinor');
  fs.writeFileSync(pscFile, pscCode);
}
