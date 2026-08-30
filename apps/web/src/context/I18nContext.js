'use client';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  DEFAULT_LANG,
  SUPPORTED_LANGS,
  translations,
} from '../i18n/translations';

const I18nContext = createContext(null);
const STORAGE_KEY = 'kb-lang';

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n debe usarse dentro de I18nProvider');
  return ctx;
};

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  // Cargar idioma guardado solo en cliente (evita mismatch de hidratación)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) {
      setLangState(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  const setLang = useCallback((next) => {
    if (!SUPPORTED_LANGS.includes(next)) return;
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next;
    }
  }, []);

  const t = useCallback(
    (key, params) => {
      const dict = translations[lang] || translations.es;
      let str = dict[key] ?? translations.es[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.split(`{${k}}`).join(String(v));
        }
      }
      return str;
    },
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export default I18nContext;
