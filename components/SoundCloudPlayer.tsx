"use client";

import { useEffect, useRef } from 'react';

interface SoundCloudPlayerProps {
  url: string;
  autoPlay?: boolean;
}

export function SoundCloudPlayer({ url, autoPlay = false }: SoundCloudPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Update the iframe src when the URL changes
    iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=${autoPlay}&color=%23ff5500&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;
  }, [url, autoPlay]);

  return (
    <iframe
      ref={iframeRef}
      width="100%"
      height="166"
      scrolling="no"
      frameBorder="no"
      allow="autoplay"
      className="rounded-lg shadow-lg"
    />
  );
} 