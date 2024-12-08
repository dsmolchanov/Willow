"use client";

import React, { useEffect, useState } from 'react';
import Waves from "react-animated-waves";

interface WaveAnimationProps {
  isListening: boolean;
  className?: string;
}

export function WaveAnimation({ isListening, className = "" }: WaveAnimationProps) {
  const [amplitude, setAmplitude] = useState(10);
  const baseAmplitude = isListening ? 10 : 30;

  useEffect(() => {
    const timer = setInterval(() => {
      const variation = Math.random() * 5;
      setAmplitude(baseAmplitude + variation);
    }, 500);

    return () => {
      clearInterval(timer);
    };
  }, [baseAmplitude]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Waves 
        amplitude={amplitude}
        colors={[
          'rgba(93, 207, 161, 0.2)',
          'rgba(93, 207, 161, 0.3)',
          'rgba(93, 207, 161, 0.2)'
        ]}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
    </div>
  );
} 