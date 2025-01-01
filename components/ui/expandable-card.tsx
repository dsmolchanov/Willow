"use client";

import React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { CircleNumber } from "./circle-number";
import { Instrument_Sans } from 'next/font/google';

const instrumentSans = Instrument_Sans({ subsets: ['latin'] });

interface ExpandableCardProps {
  number: number;
  title: string;
  description: string;
  imageSrc: string;
  isActive: boolean;
  onClick: () => void;
}

export const ExpandableCard: React.FC<ExpandableCardProps> = ({
  number,
  title,
  description,
  imageSrc,
  isActive,
  onClick,
}) => {
  return (
    <motion.div
      className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 ${
        isActive ? "w-full" : "w-24"
      }`}
      onClick={onClick}
      layout
    >
      <div className="absolute inset-0 bg-[#1F2923]/60" />
      <div className="relative h-[400px]">
        <Image
          src={imageSrc}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        <div className="absolute inset-0">
          {!isActive ? (
            <div className="w-24 h-full flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <div className={`
                  ${instrumentSans.className}
                  text-[16px] font-bold text-[#FFFAC8] 
                  whitespace-nowrap transform -rotate-90
                  leading-[19.52px]
                `}>
                  {title}
                </div>
              </div>
              <div className="pb-8 flex justify-center">
                <CircleNumber number={number} isExpanded={false} />
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col justify-between">
              <div className="p-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-3xl"
                >
                  <h3 className={`
                    ${instrumentSans.className} 
                    text-[64px] font-normal text-[#F0FF0A] 
                    leading-[78.08px] tracking-[0.1em]
                    mb-4
                  `}>
                    {title}
                  </h3>
                  <p className="text-lg text-white/90">
                    {description}
                  </p>
                </motion.div>
              </div>
              <div className="flex justify-end pb-8 pr-8">
                <CircleNumber number={number} isExpanded={true} />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}; 