const fs = require('fs');

const extraEn = `
    minor: {
      pitchTitle: "60-Second Winning Pitch",
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
    },
`;

const extraHi = `
    minor: {
      pitchTitle: "60-सेकंड की विनिंग पिच",
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
    },
`;

let content = fs.readFileSync('client/src/i18n/translations.js', 'utf8');
if (!content.includes('pitchTitle')) {
  let enEndIdx = content.indexOf('hi: {') - 5;
  content = content.substring(0, enEndIdx) + extraEn + content.substring(enEndIdx);
  let hiEndIdx = content.lastIndexOf('};') - 2;
  content = content.substring(0, hiEndIdx) + extraHi + content.substring(hiEndIdx);
  fs.writeFileSync('client/src/i18n/translations.js', content);
}

function addUseLanguage(code) {
  if (!code.includes('useLanguage')) {
    const lastImportIndex = code.lastIndexOf("import ");
    const nextLineIndex = code.indexOf("\n", lastImportIndex) + 1;
    code = code.substring(0, nextLineIndex) + "import { useLanguage } from '../../context/LanguageContext';\n" + code.substring(nextLineIndex);
    const funcMatch = code.match(/export default function \w+\([^)]*\)\s*\{/);
    if (funcMatch) {
      const idx = funcMatch.index + funcMatch[0].length;
      code = code.substring(0, idx) + "\n  const { t } = useLanguage();" + code.substring(idx);
    }
  }
  return code;
}

function translatePitchScriptCard() {
  const file = 'client/src/components/demo/PitchScriptCard.jsx';
  let code = fs.readFileSync(file, 'utf8');
  code = addUseLanguage(code);

  code = code.replace(/>\s*60-Second Winning Pitch\s*<\/h2>/g, ">{t('minor.pitchTitle')}</h2>");
  code = code.replace(/>\s*Read this to the judges during the live demo\.\s*<\/p>/g, ">{t('minor.pitchDesc')}</p>");
  code = code.replace(/"CivicTrust AI converts unstructured citizen complaints into actionable governance workflows\. A citizen can speak in Hindi or Hinglish, the system detects language, classifies the issue, identifies safety-critical urgency, routes it to the correct ward officer, clusters duplicate reports, starts an SLA timer, and records every action for accountability\. This is not just complaint registration; it is /g, "{t('minor.pitchQuote').split('intelligent')[0]}");
  code = code.replace(/>\s*intelligent grievance redressal\s*<\/strong>"\s*<\/p>/g, ">{t('minor.intelligent')}</strong>\"</p>");
  
  code = code.replace(/>\s*Technical Differentiators\s*<\/h3>/g, ">{t('minor.techDiff')}</h3>");
  code = code.replace(/Hide Details\s*<\/>/g, "{t('minor.hideDetails')}</>");
  code = code.replace(/Show Architecture\s*<\/>/g, "{t('minor.showArch')}</>");

  code = code.replace(/title: "Modular AI Layer"/g, "title: t('minor.modAI')");
  code = code.replace(/desc: "Decoupled architecture for Language, Classification, and Urgency\."/g, "desc: t('minor.modAIDesc')");
  code = code.replace(/title: "Policy-Backed SLA"/g, "title: t('minor.polSLA')");
  code = code.replace(/desc: "Deterministic SLA timers based on AI severity detection\."/g, "desc: t('minor.polSLADesc')");
  code = code.replace(/title: "Authority Routing"/g, "title: t('minor.authRoute')");
  code = code.replace(/desc: "Dynamic mapping to Ward\/Zone specific officers\."/g, "desc: t('minor.authRouteDesc')");
  code = code.replace(/title: "Semantic Clustering"/g, "title: t('minor.semCluster')");
  code = code.replace(/desc: "Groups duplicates to prevent redundant field dispatches\."/g, "desc: t('minor.semClusterDesc')");
  code = code.replace(/title: "Adaptive Taxonomy"/g, "title: t('minor.adaptTax')");
  code = code.replace(/desc: "Admins update rules\/categories without deploying code\."/g, "desc: t('minor.adaptTaxDesc')");
  code = code.replace(/title: "Privacy-First Masking"/g, "title: t('minor.privMask')");
  code = code.replace(/desc: "Regex-based PII redaction before external AI processing\."/g, "desc: t('minor.privMaskDesc')");

  fs.writeFileSync(file, code);
  console.log('Translated PitchScriptCard.jsx');
}

function translateVoiceInput() {
  const file = 'client/src/components/citizen/VoiceComplaintInput.jsx';
  let code = fs.readFileSync(file, 'utf8');
  if(!code.includes('useLanguage')) {
     const lastImportIndex = code.lastIndexOf("import ");
     const nextLineIndex = code.indexOf("\n", lastImportIndex) + 1;
     code = code.substring(0, nextLineIndex) + "import { useLanguage } from '../../context/LanguageContext';\n" + code.substring(nextLineIndex);
     const funcMatch = code.match(/export default function \w+\([^)]*\)\s*\{/);
     if (funcMatch) {
       const idx = funcMatch.index + funcMatch[0].length;
       code = code.substring(0, idx) + "\n  const { t } = useLanguage();" + code.substring(idx);
     }
  }

  code = code.replace(/>\s*Stop Recording\s*<\/span>/g, ">{t('minor.stopRecording')}</span>");
  code = code.replace(/>\s*Recording\.\.\.\s*<\/span>/g, ">{t('minor.recording')}</span>");
  code = code.replace(/>\s*Processing\.\.\.\s*<\/span>/g, ">{t('minor.processing')}</span>");
  code = code.replace(/>\s*Capture Audio\s*<\/span>/g, ">{t('minor.captureAudio')}</span>");

  fs.writeFileSync(file, code);
  console.log('Translated VoiceComplaintInput.jsx');
}

translatePitchScriptCard();
translateVoiceInput();
