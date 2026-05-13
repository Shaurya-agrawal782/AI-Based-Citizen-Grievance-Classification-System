import { createContext, useContext, useState, useCallback } from 'react';
import { translations } from '../i18n/translations';

const STORAGE_KEY = 'civictrust_lang';

const LanguageContext = createContext(null);

/**
 * Resolve a dot-path key like "nav.fileGrievance" against a translation object.
 * Falls back to the raw key string so missing translations are obvious in dev.
 */
function resolve(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return path;
    current = current[part];
  }
  return current ?? path;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && translations[stored] ? stored : 'en';
  });

  const setLang = useCallback((code) => {
    if (!translations[code]) return;
    localStorage.setItem(STORAGE_KEY, code);
    setLangState(code);
  }, []);

  /**
   * t('nav.fileGrievance')  →  translated string
   * Falls back to English if key missing in current lang.
   */
  const t = useCallback(
    (key) => {
      const inLang = resolve(translations[lang], key);
      if (inLang !== key) return inLang;
      // Fallback to English
      return resolve(translations.en, key);
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
