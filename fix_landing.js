const fs = require('fs');
let code = fs.readFileSync('client/src/pages/Landing.jsx', 'utf8');

// Move arrays inside Landing component
const arraysRegex = /(const steps = \[[\s\S]*?\];\s*const categories = \[[\s\S]*?\];\s*const features = \[[\s\S]*?\];\s*const insightMetrics = \[[\s\S]*?\];)/;
const match = code.match(arraysRegex);
if(match) {
  let arraysCode = match[1];
  
  // We can't use t() directly outside without moving it, so we move it inside Landing.
  // Actually, we don't need to translate the arrays inside the code if we just replace the hardcoded strings with t('...').
  
  arraysCode = arraysCode.replace(/'1\. Submit'/, "`t('landing.step1Title')`".replace(/`/g, ''));
  arraysCode = arraysCode.replace(/'Provide grievance details through a secure guided form, QR zone, voice, or text\.'/, "`t('landing.step1Desc')`".replace(/`/g, ''));
  arraysCode = arraysCode.replace(/'2\. AI Classification'/, "`t('landing.step2Title')`".replace(/`/g, ''));
  arraysCode = arraysCode.replace(/'CivicTrust AI classifies, prioritizes, and detects duplicate reports in seconds\.'/, "`t('landing.step2Desc')`".replace(/`/g, ''));
  arraysCode = arraysCode.replace(/'3\. Routing'/, "`t('landing.step3Title')`".replace(/`/g, ''));
  arraysCode = arraysCode.replace(/'The issue is routed to the responsible departmental desk with clear SLA context\.'/, "`t('landing.step3Desc')`".replace(/`/g, ''));
  arraysCode = arraysCode.replace(/'4\. Resolution'/, "`t('landing.step4Title')`".replace(/`/g, ''));
  arraysCode = arraysCode.replace(/'Citizens track every status change until official closure and confirmation\.'/, "`t('landing.step4Desc')`".replace(/`/g, ''));

  arraysCode = arraysCode.replace(/'Avg\. Classification Time'/, "`t('landing.avgClassTime')`".replace(/`/g, ''));
  arraysCode = arraysCode.replace(/'Critical SLA'/, "`t('landing.criticalSla')`".replace(/`/g, ''));
  arraysCode = arraysCode.replace(/'QR Zones'/, "`t('landing.qrZonesEnabled')`".replace(/`/g, ''));
  arraysCode = arraysCode.replace(/'Ticket Tracking'/, "`t('landing.ticketTrackingActive')`".replace(/`/g, ''));
  arraysCode = arraysCode.replace(/'Enabled'/, "`t('landing.enabled')`".replace(/`/g, ''));
  arraysCode = arraysCode.replace(/'Active'/, "`t('landing.active')`".replace(/`/g, ''));
  
  // Remove arrays from outside
  code = code.replace(arraysRegex, '');
  
  // Insert inside Landing
  const insertMarker = "const navigate = useNavigate();";
  const insertIndex = code.indexOf(insertMarker);
  if(insertIndex !== -1) {
    code = code.substring(0, insertIndex + insertMarker.length) + '\n\n  ' + arraysCode.split('\n').join('\n  ') + code.substring(insertIndex + insertMarker.length);
  }
}

code = code.replace(/>AI Insight Panel</g, ">{t('landing.insightPanel')}<");
code = code.replace(/>Live portal readiness</g, ">{t('landing.livePortalReadiness')}<");

fs.writeFileSync('client/src/pages/Landing.jsx', code);
console.log('Landing arrays moved and translated');
