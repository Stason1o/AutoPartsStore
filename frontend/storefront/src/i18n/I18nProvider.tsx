'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Dict, Locale } from '@/i18n/dictionaries';

interface I18n {
  locale: Locale;
  dict: Dict;
  /** Префиксует путь локалью: lp('/catalog') → '/ro/catalog'. */
  lp: (path: string) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ locale, dict, children }: {
  locale: Locale; dict: Dict; children: ReactNode;
}) {
  const value = useMemo<I18n>(() => ({
    locale,
    dict,
    lp: (path: string) => `/${locale}${path === '/' ? '' : path}` || '/',
  }), [locale, dict]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n вне I18nProvider');
  return ctx;
}
