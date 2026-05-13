const fs = require('fs');

function addUseLanguage(code) {
  if (!code.includes('useLanguage')) {
    const lastImportIndex = code.lastIndexOf("import ");
    const nextLineIndex = code.indexOf("\n", lastImportIndex) + 1;
    code = code.substring(0, nextLineIndex) + "import { useLanguage } from '../context/LanguageContext';\n" + code.substring(nextLineIndex);
    const funcMatch = code.match(/export default function \w+\([^)]*\)\s*\{/);
    if (funcMatch) {
      const idx = funcMatch.index + funcMatch[0].length;
      code = code.substring(0, idx) + "\n  const { t } = useLanguage();" + code.substring(idx);
    }
  }
  return code;
}

function translateWhatsApp() {
  const file = 'client/src/pages/WhatsAppDemo.jsx';
  let code = fs.readFileSync(file, 'utf8');
  code = addUseLanguage(code);
  code = code.replace(/>\s*WhatsApp Simulator\s*<\/h1>/g, ">{t('demo.whatsappSimulator')}</h1>");
  fs.writeFileSync(file, code);
  console.log('Translated WhatsAppDemo.jsx');
}

function translateIVR() {
  const file = 'client/src/pages/IVRDemo.jsx';
  let code = fs.readFileSync(file, 'utf8');
  code = addUseLanguage(code);
  code = code.replace(/>\s*IVR Simulator\s*<\/h1>/g, ">{t('demo.ivrSimulator')}</h1>");
  fs.writeFileSync(file, code);
  console.log('Translated IVRDemo.jsx');
}

translateWhatsApp();
translateIVR();
