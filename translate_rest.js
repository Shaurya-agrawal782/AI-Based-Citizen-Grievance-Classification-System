const fs = require('fs');

function translateTrackComplaint() {
  const file = 'client/src/pages/TrackComplaint.jsx';
  let code = fs.readFileSync(file, 'utf8');

  if (!code.includes('useLanguage')) {
    code = code.replace("import { useAuth } from '../context/AuthContext';", "import { useAuth } from '../context/AuthContext';\nimport { useLanguage } from '../context/LanguageContext';");
    code = code.replace("const { user } = useAuth();", "const { user } = useAuth();\n  const { t } = useLanguage();");
  }

  code = code.replace(/>\s*Track Your Complaint\s*<\/h1>/g, ">{t('ticket.title')}</h1>");
  code = code.replace(/>\s*Enter your Ticket ID to check status, SLA and officer assignment\.\s*<\/p>/g, ">{t('ticket.subtitle')}</p>");
  code = code.replace(/placeholder="Enter Ticket ID or Complaint ID"/g, "placeholder={t('ticket.searchPlaceholder')}");
  code = code.replace(/>\s*Track Ticket\s*<\/button>/g, ">{t('ticket.searchButton')}</button>");
  code = code.replace(/>\s*No ticket found\. Please check your Ticket ID\.\s*<\/p>/g, ">{t('ticket.notFound')}</p>");

  fs.writeFileSync(file, code);
  console.log('Translated TrackComplaint.jsx');
}

function translateAIAssistant() {
  const file = 'client/src/components/AIAssistant.jsx';
  let code = fs.readFileSync(file, 'utf8');

  if (!code.includes('useLanguage')) {
    code = code.replace("import { useState, useRef, useEffect } from 'react';", "import { useState, useRef, useEffect } from 'react';\nimport { useLanguage } from '../context/LanguageContext';");
    code = code.replace("const [isOpen, setIsOpen] = useState(false);", "const { t } = useLanguage();\n  const [isOpen, setIsOpen] = useState(false);");
  }

  code = code.replace(/>\s*CivicTrust Assistant\s*<\/h3>/g, ">{t('chatbot.title')}</h3>");
  code = code.replace(/>\s*File, track and understand grievances\s*<\/p>/g, ">{t('chatbot.subtitle')}</p>");
  code = code.replace(/placeholder="Ask about filing, tracking, SLA\.\.\."/g, "placeholder={t('chatbot.inputPlaceholder')}");

  fs.writeFileSync(file, code);
  console.log('Translated AIAssistant.jsx');
}

function translateTrackTicketRest() {
  const file = 'client/src/pages/TrackTicket.jsx';
  let code = fs.readFileSync(file, 'utf8');

  code = code.replace(/>\s*Transparent Ticket Status\s*<\/div>/g, ">{t('ticket.transparentStatus')}</div>");
  code = code.replace(/>\s*Demo IDs:\s*<\/span>/g, ">{t('ticket.demoIds')}</span>");
  code = code.replace(/>\s*Ticket Status:\s*<span/g, ">{t('ticket.ticketStatus')}: <span");
  code = code.replace(/SLA active\s*<\/span>/g, "{t('ticket.slaActive')}</span>");
  code = code.replace(/Resolution Timeline\s*<\/h3>/g, "{t('ticket.resolutionTimeline')}</h3>");

  fs.writeFileSync(file, code);
  console.log('Translated TrackTicket.jsx rest');
}

function translateTicketReceipt() {
  const file = 'client/src/components/citizen/TicketReceipt.jsx';
  let code = fs.readFileSync(file, 'utf8');

  if (!code.includes('useLanguage')) {
    code = code.replace("import { Download, Printer, CheckCircle2, ShieldAlert, ArrowRight, Camera, User, Phone, Briefcase, MapPin } from 'lucide-react';", "import { Download, Printer, CheckCircle2, ShieldAlert, ArrowRight, Camera, User, Phone, Briefcase, MapPin } from 'lucide-react';\nimport { useLanguage } from '../../context/LanguageContext';");
    code = code.replace("export default function TicketReceipt\\(\\{", "export default function TicketReceipt({");
    
    const funcStart = code.indexOf("export default function TicketReceipt(");
    const paramsEnd = code.indexOf("}) {", funcStart);
    if(funcStart !== -1 && paramsEnd !== -1) {
      code = code.substring(0, paramsEnd + 4) + "\n  const { t } = useLanguage();" + code.substring(paramsEnd + 4);
    }
  }

  code = code.replace(/>\s*Official Ticket Receipt\s*<\/h2>/g, ">{t('ticket.receiptTitle')}</h2>");
  code = code.replace(/>\s*Download PDF\s*<\/span>/g, ">{t('ticket.downloadPdf')}</span>");
  code = code.replace(/>\s*Print\s*<\/span>/g, ">{t('ticket.print')}</span>");
  code = code.replace(/>\s*Important:\s*<\/strong>/g, ">{t('ticket.important')}</strong>");
  code = code.replace(/Keep this ticket ID for future reference\. Real-time updates will be sent to your registered contact\.\s*<\/span>/g, "{t('ticket.receiptNote')}</span>");

  fs.writeFileSync(file, code);
  console.log('Translated TicketReceipt.jsx');
}

translateTrackComplaint();
translateAIAssistant();
translateTrackTicketRest();
translateTicketReceipt();
