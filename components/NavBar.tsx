"use client";

import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from '@/context/LanguageContext';
import { Globe } from "lucide-react";

const languageNames = {
  en: "English",
  ru: "Русский"
} as const;

export function Navbar() {
  const { language, setLanguage } = useLanguage();

  console.log('Navbar rendered with language:', language);

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center p-6 bg-transparent backdrop-blur-sm">
      <div className="flex items-center">
        <Image
          src="/images/willow_logo.png"
          alt="Willow Training Logo"
          width={150}
          height={40}
          className="object-contain"
        />
      </div>
      <div className="flex items-center gap-4">
        <Select
          value={language}
          onValueChange={(value: 'en' | 'ru') => {
            console.log('Selecting language:', value);
            setLanguage(value);
          }}
        >
          <SelectTrigger 
            className="w-[40px] h-[40px] p-0 border-0 bg-transparent hover:bg-white/10 transition-colors duration-200"
          >
            <Globe className="h-5 w-5 text-white" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white/90 backdrop-blur-sm border-white/20">
            <SelectItem 
              value="en"
              className="cursor-pointer"
            >
              {languageNames.en}
            </SelectItem>
            <SelectItem 
              value="ru"
              className="cursor-pointer"
            >
              {languageNames.ru}
            </SelectItem>
          </SelectContent>
        </Select>
        <SignedOut>
          <SignInButton />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  );
}