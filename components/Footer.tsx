"use client";

import { translations } from '@/translations';
import Image from 'next/image';
import Link from 'next/link';
import { BackgroundGradientAnimation } from '@/components/ui/background-gradient-animation';

export const Footer = () => {
  const t = translations.en;

  const socialLinks = [
    { name: t.footer.social.links.linkedin, icon: '/icons/social/linkedin.svg', href: '#' },
    { name: t.footer.social.links.reddit, icon: '/icons/social/reddit.svg', href: '#' },
    { name: t.footer.social.links.github, icon: '/icons/social/github.svg', href: '#' },
    { name: t.footer.social.links.telegram, icon: '/icons/social/telegram.svg', href: '#' },
  ];

  const managementLinks = [
    { name: t.footer.management.links.privacy, href: '#' },
    { name: t.footer.management.links.terms, href: '#' },
    { name: t.footer.management.links.contact, href: '#' },
  ];

  const navigationLinks = [
    { name: t.footer.navigation.links.home, href: '#' },
    { name: t.footer.navigation.links.about, href: '#' },
    { name: t.footer.navigation.links.pricing, href: '#' },
    { name: t.footer.navigation.links.blog, href: '#' },
  ];

  return (
    <BackgroundGradientAnimation>
      <footer className="relative text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo */}
            <div className="flex flex-col items-start">
              <Image src="/images/willow_logo.png" alt="Willow" width={120} height={40} className="mb-6 brightness-200" />
            </div>

            {/* Social Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t.footer.social.title}</h3>
              <div className="flex flex-col space-y-4">
                {socialLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
                  >
                    <Image src={link.icon} alt={link.name} width={24} height={24} className="text-white" />
                    <span>{link.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Management Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t.footer.management.title}</h3>
              <div className="flex flex-col space-y-4">
                {managementLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Navigation Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t.footer.navigation.title}</h3>
              <div className="flex flex-col space-y-4">
                {navigationLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-16 pt-8 border-t border-white/20 text-center text-white/60">
            {t.footer.copyright}
          </div>
        </div>
      </footer>
    </BackgroundGradientAnimation>
  );
};

export default Footer; 