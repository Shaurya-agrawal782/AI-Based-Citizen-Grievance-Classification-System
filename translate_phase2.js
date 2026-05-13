const fs = require('fs');

function addUseLanguage(code) {
  if (!code.includes('useLanguage')) {
    // Attempt to find where to add the import
    const lastImportIndex = code.lastIndexOf("import ");
    const nextLineIndex = code.indexOf("\n", lastImportIndex) + 1;
    code = code.substring(0, nextLineIndex) + "import { useLanguage } from '../context/LanguageContext';\n" + code.substring(nextLineIndex);
    
    // Find default export
    const funcMatch = code.match(/export default function \w+\([^)]*\)\s*\{/);
    if (funcMatch) {
      const idx = funcMatch.index + funcMatch[0].length;
      code = code.substring(0, idx) + "\n  const { t } = useLanguage();" + code.substring(idx);
    }
  }
  return code;
}

function translateQRZones() {
  const file = 'client/src/pages/QRZones.jsx';
  let code = fs.readFileSync(file, 'utf8');
  code = addUseLanguage(code);

  code = code.replace(/>\s*QR Zone Reporting\s*<\/h1>/g, ">{t('qr.title')}</h1>");
  code = code.replace(/>\s*Scan or open a public QR zone to report issues with location and officer context pre-filled\.\s*<\/p>/g, ">{t('qr.subtitle')}</p>");
  code = code.replace(/>\s*Open QR Report\s*<\/span>/g, ">{t('qr.openReport')}</span>");
  code = code.replace(/>\s*Copy Link\s*<\/button>/g, ">{t('qr.copyLink')}</button>");
  code = code.replace(/>\s*Download QR\s*<\/button>/g, ">{t('qr.downloadQR')}</button>");
  code = code.replace(/>\s*Verified QR Zone\s*<\/span>/g, ">{t('qr.verifiedZone')}</span>");

  fs.writeFileSync(file, code);
  console.log('Translated QRZones.jsx');
}

function translateCopilot() {
  const file = 'client/src/pages/Copilot.jsx';
  let code = fs.readFileSync(file, 'utf8');
  code = addUseLanguage(code);

  code = code.replace(/>\s*CivicDraft AI\s*<\/h1>/g, ">{t('copilot.title')}</h1>");
  code = code.replace(/>\s*Convert your rough complaint into a formal government application\.\s*<\/p>/g, ">{t('copilot.subtitle')}</p>");
  code = code.replace(/placeholder="Type your complaint in rough language\.\.\."/g, "placeholder={t('copilot.inputPlaceholder')}");
  code = code.replace(/>\s*Generate Formal Draft\s*<\/span>/g, ">{t('copilot.generate')}</span>");
  code = code.replace(/>\s*Confidence Score\s*<\/p>/g, ">{t('copilot.confidenceScore')}</p>");
  code = code.replace(/>\s*Formal Draft\s*<\/h3>/g, ">{t('copilot.formalDraft')}</h3>");
  code = code.replace(/>\s*Use This Draft\s*<\/button>/g, ">{t('copilot.useThisDraft')}</button>");

  fs.writeFileSync(file, code);
  console.log('Translated Copilot.jsx');
}

function translateDemoMode() {
  const file = 'client/src/pages/DemoMode.jsx';
  let code = fs.readFileSync(file, 'utf8');
  code = addUseLanguage(code);

  code = code.replace(/>\s*Demo Mode & Winning Pitch\s*<\/h1>/g, ">{t('demo.title')}</h1>");
  code = code.replace(/>\s*Experience CivicTrust AI from multiple perspectives and view our pitch\.\s*<\/p>/g, ">{t('demo.subtitle')}</p>");
  code = code.replace(/>\s*Winning Pitch\s*<\/h2>/g, ">{t('demo.pitchTitle')}</h2>");
  code = code.replace(/>\s*Play Pitch\s*<\/span>/g, ">{t('demo.playPitch')}</span>");
  code = code.replace(/>\s*Technical Architecture\s*<\/h2>/g, ">{t('demo.architecture')}</h2>");
  code = code.replace(/>\s*Reset Demo Data\s*<\/button>/g, ">{t('demo.resetDemo')}</button>");
  code = code.replace(/>\s*Generate Mock Tickets\s*<\/button>/g, ">{t('demo.generateMock')}</button>");
  code = code.replace(/>\s*IVR Simulator\s*<\/h3>/g, ">{t('demo.ivrSimulator')}</h3>");
  code = code.replace(/>\s*WhatsApp Simulator\s*<\/h3>/g, ">{t('demo.whatsappSimulator')}</h3>");

  fs.writeFileSync(file, code);
  console.log('Translated DemoMode.jsx');
}

function translateAdminDashboard() {
  const file = 'client/src/pages/AdminDashboard.jsx';
  let code = fs.readFileSync(file, 'utf8');
  code = addUseLanguage(code);

  code = code.replace(/>\s*Admin Dashboard\s*<\/h1>/g, ">{t('admin.dashboardTitle')}</h1>");
  code = code.replace(/>\s*Command Center\s*<\/p>/g, ">{t('admin.commandCenter')}</p>");
  code = code.replace(/>\s*Active Tickets\s*<\/div>/g, ">{t('admin.activeTickets')}</div>");
  code = code.replace(/>\s*Resolved Tickets\s*<\/div>/g, ">{t('admin.resolvedTickets')}</div>");
  code = code.replace(/>\s*Escalated\s*<\/div>/g, ">{t('admin.escalated')}</div>");
  code = code.replace(/>\s*Avg\. Resolution Time\s*<\/div>/g, ">{t('admin.avgResolutionTime')}</div>");
  code = code.replace(/>\s*hours\s*<\/span>/g, ">{t('admin.hours')}</span>");
  code = code.replace(/>\s*Live Grievance Queue\s*<\/h2>/g, ">{t('admin.liveQueue')}</h2>");
  code = code.replace(/>\s*View Details\s*<\/Link>/g, ">{t('admin.viewDetails')}</Link>");

  fs.writeFileSync(file, code);
  console.log('Translated AdminDashboard.jsx');
}

translateQRZones();
translateCopilot();
translateDemoMode();
translateAdminDashboard();
