const fs = require('fs');

function translateNewGrievance() {
  const file = 'client/src/pages/NewGrievance.jsx';
  let code = fs.readFileSync(file, 'utf8');

  // Insert imports
  if (!code.includes('useLanguage')) {
    code = code.replace("import { useAuth } from '../context/AuthContext';", "import { useAuth } from '../context/AuthContext';\nimport { useLanguage } from '../context/LanguageContext';");
    
    // Find where NewGrievance function starts
    const funcStart = code.indexOf('export default function NewGrievance(');
    const startIdx = code.indexOf('{', funcStart) + 1;
    code = code.substring(0, startIdx) + "\n  const { t } = useLanguage();" + code.substring(startIdx);
  }

  // Replacements
  code = code.replace(/>\s*File a Grievance\s*<\/h1>/g, ">{t('grievance.title')}</h1>");
  code = code.replace(/>\s*Submit your civic issue with location, evidence and clear details\.\s*<\/p>/g, ">{t('grievance.subtitle')}</p>");
  code = code.replace(/>\s*Complaint Title\s*<\/label>/g, ">{t('grievance.complaintTitle')}</label>");
  code = code.replace(/>\s*Description\s*<\/label>/g, ">{t('grievance.description')}</label>");
  code = code.replace(/placeholder="Describe your issue clearly\. Example: School ke paas bijli ka pole spark kar raha hai\."/g, "placeholder={t('grievance.descriptionPlaceholder')}");
  
  code = code.replace(/>\s*Location Details\s*<\/h3>/g, ">{t('grievance.locationDetails')}</h3>");
  code = code.replace(/>\s*Detect Live Location\s*<\/span>/g, ">{t('grievance.detectLocation')}</span>");
  code = code.replace(/>\s*Exact Landmark \/ Place\s*<\/label>/g, ">{t('grievance.exactLandmark')}</label>");
  code = code.replace(/>\s*Submit Complaint\s*<\/span>/g, ">{t('grievance.submitComplaint')}</span>");
  
  code = code.replace(/>\s*Live Geo-Tagged Evidence\s*<\/h3>/g, ">{t('grievance.liveEvidence')}</h3>");
  // The capture button
  code = code.replace(/>\s*Capture Live Geo-Tagged Evidence\s*<\/span>/g, ">{t('grievance.captureEvidence')}</span>");
  
  code = code.replace(/>\s*Complaint Quality Score\s*<\/h4>/g, ">{t('grievance.qualityScore')}</h4>");
  code = code.replace(/>\s*Quick Emergency Report\s*<\/h3>/g, ">{t('grievance.emergencyReport')}</h3>");
  
  code = code.replace(/>\s*Suggested Address\s*<\/span>/g, ">{t('grievance.suggestedAddress')}</span>");
  code = code.replace(/>\s*Confirm Pincode\s*<\/label>/g, ">{t('grievance.confirmPincode')}</label>");
  code = code.replace(/>\s*Use This Location\s*<\/button>/g, ">{t('grievance.useThisLocation')}</button>");
  code = code.replace(/>\s*Re-detect\s*<\/span>/g, ">{t('grievance.redetect')}</span>");
  code = code.replace(/>\s*Final Location Preview\s*<\/p>/g, ">{t('grievance.finalPreview')}</p>");
  
  code = code.replace(/>\s*Contact Information\s*<\/h3>/g, ">{t('grievance.contactInfo')}</h3>");
  code = code.replace(/>\s*Incident Details\s*<\/h3>/g, ">{t('grievance.incidentDetails')}</h3>");
  code = code.replace(/>\s*Review & Submit\s*<\/h3>/g, ">{t('grievance.reviewSubmit')}</h3>");
  
  code = code.replace(/>\s*Guided Civic Intake\s*<\/div>/g, ">{t('grievance.guidedIntake')}</div>");
  
  // Wait, the Breadcrumb "New Grievance" -> {t('grievance.newGrievance')}
  code = code.replace(/>\s*New Grievance\s*<\/span>/g, ">{t('grievance.newGrievance')}</span>");

  fs.writeFileSync(file, code);
  console.log('Translated NewGrievance.jsx');
}

translateNewGrievance();
