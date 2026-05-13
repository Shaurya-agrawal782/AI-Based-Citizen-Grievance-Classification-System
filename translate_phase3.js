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

function translateOmniAccess() {
  const file = 'client/src/pages/OmniAccess.jsx';
  let code = fs.readFileSync(file, 'utf8');
  code = addUseLanguage(code);

  code = code.replace(/>\s*OmniAccess\s*<\/h1>/g, ">{t('nav.omniAccess')}</h1>");
  fs.writeFileSync(file, code);
  console.log('Translated OmniAccess.jsx');
}

function translateAnalytics() {
  const file = 'client/src/pages/Analytics.jsx';
  let code = fs.readFileSync(file, 'utf8');
  code = addUseLanguage(code);

  code = code.replace(/>\s*System Analytics\s*<\/h1>/g, ">{t('admin.analytics')}</h1>");
  code = code.replace(/>\s*Taxonomy Studio\s*<\/Link>/g, ">{t('admin.taxonomy')}</Link>");
  fs.writeFileSync(file, code);
  console.log('Translated Analytics.jsx');
}

function translateTaxonomyStudio() {
  const file = 'client/src/pages/TaxonomyStudio.jsx';
  let code = fs.readFileSync(file, 'utf8');
  code = addUseLanguage(code);

  code = code.replace(/>\s*Taxonomy Studio\s*<\/h1>/g, ">{t('admin.taxonomy')}</h1>");
  fs.writeFileSync(file, code);
  console.log('Translated TaxonomyStudio.jsx');
}

function translateGrievanceDetail() {
  const file = 'client/src/pages/GrievanceDetail.jsx';
  let code = fs.readFileSync(file, 'utf8');
  code = addUseLanguage(code);

  code = code.replace(/>\s*Assign Officer\s*<\/h3>/g, ">{t('admin.assignOfficer')}</h3>");
  code = code.replace(/>\s*Update Status\s*<\/h3>/g, ">{t('admin.updateStatus')}</h3>");
  code = code.replace(/>\s*Geospatial View\s*<\/span>/g, ">{t('admin.mapView')}</span>");
  fs.writeFileSync(file, code);
  console.log('Translated GrievanceDetail.jsx');
}

translateOmniAccess();
translateAnalytics();
translateTaxonomyStudio();
translateGrievanceDetail();
