"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface WidgetContextType {
  isHeroWidgetVisible: boolean;
  setHeroWidgetVisible: (visible: boolean) => void;
}

const WidgetContext = createContext<WidgetContextType | undefined>(undefined);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  const [isHeroWidgetVisible, setHeroWidgetVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const ctaSection = document.getElementById('cta-section');
      if (ctaSection) {
        const rect = ctaSection.getBoundingClientRect();
        setHeroWidgetVisible(rect.top > window.innerHeight);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <WidgetContext.Provider value={{ isHeroWidgetVisible, setHeroWidgetVisible }}>
      {children}
    </WidgetContext.Provider>
  );
}

export function useWidget() {
  const context = useContext(WidgetContext);
  if (context === undefined) {
    throw new Error('useWidget must be used within a WidgetProvider');
  }
  return context;
} 