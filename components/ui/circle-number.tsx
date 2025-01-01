"use client";

import React from "react";
import { Instrument_Sans } from 'next/font/google';

const instrumentSans = Instrument_Sans({ subsets: ['latin'] });

interface CircleNumberProps {
  number: number;
  isExpanded?: boolean;
}

export const CircleNumber: React.FC<CircleNumberProps> = ({ number, isExpanded }) => {
  return (
    <div className={`relative inline-flex items-center justify-center`}>
      <div className={`
        w-[36px] h-[42px] 
        flex items-center justify-center
        border border-[#FFFF00]
        ${isExpanded ? 'rounded-[16px]' : 'rounded-[16px]'}
      `}>
        <span 
          className={`${instrumentSans.className} text-[24px] font-normal text-[#FFFF00] leading-none`}
        >
          {number}
        </span>
      </div>
    </div>
  );
}; 