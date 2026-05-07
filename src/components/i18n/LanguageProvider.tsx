'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AppLanguage } from '@/types/workout';
import { LANGUAGE_COOKIE, LANGUAGE_STORAGE_KEY, normalizeLanguage } from '@/lib/i18n/language';
import { translations, type TranslationTree } from '@/lib/i18n/translations';

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: TranslationTree;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  initialLanguage: AppLanguage;
  children: ReactNode;
}

function syncLanguage(language: AppLanguage): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.cookie = `${LANGUAGE_COOKIE}=${language}; path=/; max-age=31536000; samesite=lax`;
  }
}

export function LanguageProvider({ initialLanguage, children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<AppLanguage>(() => normalizeLanguage(initialLanguage));

  useEffect(() => {
    syncLanguage(language);
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: setLanguageState,
        t: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useI18n must be used within LanguageProvider');
  }
  return ctx;
}

