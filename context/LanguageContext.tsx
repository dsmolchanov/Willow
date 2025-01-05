"use client";

import React, { createContext, useContext, useState } from 'react';
import { translations, Language } from '@/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (section: string, key?: string, ...params: any[]) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('ru');

  // Translation function
  const t = (section: string, key?: string, ...params: any[]) => {
    try {
      let translation: any = translations[language];
      const parts = [section, ...(key ? key.split('.') : [])];
      
      for (const part of parts) {
        translation = translation[part];
      }

      if (Array.isArray(translation)) {
        return translation;
      }

      if (params.length) {
        return params.reduce((str, param, i) => 
          str.replace(new RegExp(`\\{${i}\\}`, 'g'), param), 
          translation as string
        );
      }

      return translation as string;
    } catch (error) {
      console.warn(`Translation not found for: ${section}${key ? '.' + key : ''}`);
      return `${section}${key ? '.' + key : ''}`;
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 