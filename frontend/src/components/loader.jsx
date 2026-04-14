import React, { useEffect, useRef, useState } from 'react';
import '../styles/componentstyles/loader.css';

export const loaderConfig = {
  text: "3i Services",
  durationMs: 3000, // 3 seconds default
  waves: {
    frontSpeed: 0.18, 
    midSpeed: 0.25,   
    backSpeed: 0.12,  
  },
  transitions: {
    diveZoomDuration: 1200, 
    fadeDelay: 150,         
    unmountDelay: 1200      
  }
};

export default function Loader({ onComplete }) {
  const [isLoaderRemoved, setIsLoaderRemoved] = useState(false);

  const brandTextRef = useRef(null);
  const progressTextRef = useRef(null);
  const progressContainerRef = useRef(null);
  const loaderRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('overflow-hidden');

    let animationFrameId;
    let isUnmounted = false;
    let isFinishing = false;
    const startTime = Date.now();

    const easeInOutSine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;

    const updateLoader = () => {
      if (isUnmounted) return;

      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / loaderConfig.durationMs, 1);
      
      const easedProgress = easeInOutSine(rawProgress);
      const percentage = Math.floor(easedProgress * 100);

      const waveFrontX = (elapsed * loaderConfig.waves.frontSpeed) % 350;
      const waveMidX = (elapsed * loaderConfig.waves.midSpeed) % 300; 
      const waveBackX = (elapsed * loaderConfig.waves.backSpeed) % 400;

      if (!isFinishing) {
        if (progressTextRef.current) progressTextRef.current.innerText = `${percentage}%`;
        if (brandTextRef.current) brandTextRef.current.style.setProperty('--fill', `${percentage}%`);
        
        if (rawProgress >= 1) {
          isFinishing = true;
          if (brandTextRef.current) brandTextRef.current.style.setProperty('--fill', `100%`);
          if (progressTextRef.current) progressTextRef.current.innerText = `100%`;
          finishLoading();
        }
      }

      if (brandTextRef.current && !isLoaderRemoved) {
        brandTextRef.current.style.setProperty('--wave-front-x', `-${waveFrontX}px`);
        brandTextRef.current.style.setProperty('--wave-mid-x', `${waveMidX}px`); 
        brandTextRef.current.style.setProperty('--wave-back-x', `-${waveBackX}px`);
      }

      animationFrameId = requestAnimationFrame(updateLoader);
    };

    const finishLoading = () => {
      if (progressContainerRef.current) progressContainerRef.current.classList.add('progress-fade');
      if (brandTextRef.current) brandTextRef.current.classList.add('text-dive');

      setTimeout(() => {
        if (loaderRef.current) loaderRef.current.classList.add('loader-exit');
        document.body.classList.remove('overflow-hidden');

        if (onComplete) onComplete();

        setTimeout(() => {
          setIsLoaderRemoved(true);
        }, loaderConfig.transitions.unmountDelay);
        
      }, loaderConfig.transitions.fadeDelay);
    };

    animationFrameId = requestAnimationFrame(updateLoader);

    return () => {
      isUnmounted = true;
      cancelAnimationFrame(animationFrameId);
      document.body.classList.remove('overflow-hidden');
    };
  }, [onComplete]);

  if (isLoaderRemoved) return null;

  return (
    <div ref={loaderRef} className="fixed inset-0 z-[9999] bg-rose-50 flex flex-col items-center justify-center will-change-transform">
      <div className="relative inline-block px-4 md:px-8 max-w-[calc(100vw-2rem)]">
        <h1
          ref={brandTextRef}
          className="water-fill text-3xl sm:text-5xl md:text-8xl font-bold tracking-tighter uppercase text-center break-words"
          data-text={loaderConfig.text}
        >
          {loaderConfig.text}
        </h1>

        <div
          ref={progressContainerRef}
          className="absolute bottom-1 right-0 sm:-right-8 flex items-baseline space-x-1.5 transform translate-y-full"
        >
          <span className="text-rose-700/70 font-semibold text-[8px] sm:text-[10px] tracking-[0.2em] uppercase">
            Loading
          </span>
          <span
            ref={progressTextRef}
            className="text-rose-950 font-bold text-base sm:text-2xl tabular-nums tracking-tighter leading-none"
          >
            0%
          </span>
        </div>
      </div>
    </div>
  );
}
