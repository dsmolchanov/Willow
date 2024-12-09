"use client";

import * as React from "react"
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import Image from 'next/image';
import { Check, Globe } from "lucide-react";
import { useLanguage } from '@/context/LanguageContext';
import { Button } from "../components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { cn } from "../lib/utils";
import Link from "next/link";

const languages = [
  {
    value: "en",
    label: "English",
  },
  {
    value: "ru",
    label: "Русский",
  },
] as const;

export const NavBar = () => {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const { isSignedIn } = useAuth();

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
      <div className="flex items-center gap-3">
        <div className="bg-white border border-gray-200 rounded-lg h-9 flex items-center">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                role="combobox"
                aria-expanded={open}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <Globe className="h-4 w-4 text-gray-700" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-white border-gray-200" align="end">
              <Command>
                <CommandList>
                  <CommandEmpty>No language found.</CommandEmpty>
                  <CommandGroup>
                    {languages.map((lang) => (
                      <CommandItem
                        key={lang.value}
                        value={lang.value}
                        onSelect={(currentValue) => {
                          setLanguage(currentValue as typeof language);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            language === lang.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {lang.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <SignedOut>
          <div className="bg-white border border-gray-200 rounded-lg h-9 flex items-center px-3">
            <SignInButton>
              <button className="text-sm text-gray-700">Sign In</button>
            </SignInButton>
          </div>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
        {isSignedIn && (
          <Link 
            href="/dashboard" 
            className="text-sm font-semibold leading-6 text-gray-900"
          >
            Dashboard
          </Link>
        )}
      </div>
    </header>
  );
}