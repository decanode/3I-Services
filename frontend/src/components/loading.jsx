import React, { useState, useEffect, useRef } from 'react';
const PageLoader = ({ pageName = 'Loading', isDataLoading = false, onComplete, duration = 1500 }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const startTimeRef = useRef(Date.now());
  const timerDoneRef = useRef(false);
  const dataLoadedRef = useRef(false);
  const exitingRef = useRef(false);

  // Track data loaded state via ref so the interval can read it
  useEffect(() => {
    dataLoadedRef.current = !isDataLoading;
  }, [isDataLoading]);

  // Single interval drives everything
  useEffect(() => {
    const tryExit = () => {
      if (exitingRef.current) return;
      if (timerDoneRef.current && dataLoadedRef.current) {
        exitingRef.current = true;
        setProgress(100);

        // Brief pause at 100%, then slide out
        setTimeout(() => {
          setIsExiting(true);
          // After exit animation completes, call onComplete
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 500);
        }, 400);
      }
    };

    const id = setInterval(() => {
      if (exitingRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const ratio = Math.min(elapsed / duration, 1);

      if (ratio < 1) {
        // Animate to 90% over the duration
        setProgress(Math.floor(ratio * 90));
      } else {
        // Timer done — slowly creep toward 99% while waiting for data
        timerDoneRef.current = true;
        tryExit();
        if (!exitingRef.current) {
          setProgress(prev => Math.min(prev + 1, 99));
        }
      }
    }, 30);

    return () => clearInterval(id);
  }, [duration, onComplete]);

  // If data finishes before timer, check exit
  useEffect(() => {
    if (!isDataLoading && timerDoneRef.current && !exitingRef.current) {
      exitingRef.current = true;
      setProgress(100);
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 500);
      }, 400);
    }
  }, [isDataLoading, onComplete]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap');

        .stylish-font {
          font-family: 'Space Grotesk', sans-serif;
          font-style: normal;
          font-weight: 700;
          letter-spacing: -0.04em;
          line-height: 1;
        }
        .loader-exit {
          transform: translateY(-100%);
          transition: transform 1s cubic-bezier(0.76, 0, 0.24, 1);
        }
        .text-mask {
          clip-path: polygon(0 0, 100% 0, 100% 100%, 0% 100%);
        }
        .reveal-text {
          animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform: translateY(120%);
        }
        @keyframes slideUp {
          to {
            transform: translateY(0%);
          }
        }
      `}</style>

      <div
        className={`fixed inset-0 z-50 flex flex-col justify-between bg-white text-zinc-900 w-full h-full overflow-hidden origin-top ${
          isExiting ? 'loader-exit' : ''
        }`}
      >
        <div className="flex justify-between items-center p-6 md:p-10 w-full opacity-70">
          <div className="text-sm font-medium tracking-widest uppercase font-sans">Loading</div>
          <div className="text-sm font-medium tracking-widest uppercase font-sans">Please Wait</div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 w-full overflow-hidden">
          <div className="text-mask overflow-hidden pb-4 relative w-fit mx-auto pr-4 max-w-[calc(100vw-2rem)]">
            <h1
              className="reveal-text stylish-font text-[2rem] sm:text-[3.5rem] md:text-[6rem] lg:text-[9rem] text-center text-zinc-300 leading-none"
            >
              {pageName}
            </h1>

            <h1
              className="reveal-text absolute top-0 left-0 w-full stylish-font text-[2rem] sm:text-[3.5rem] md:text-[6rem] lg:text-[9rem] text-center text-zinc-900 transition-all duration-300 ease-out pr-4 leading-none"
              style={{
                clipPath: `inset(0 ${100 - progress}% 0 0)`
              }}
            >
              {pageName}
            </h1>
          </div>
        </div>

        <div className="w-full p-4 md:p-10 flex flex-col gap-3 overflow-hidden">
          <div className="flex justify-between items-end w-full">
            <span className="text-xs md:text-sm text-zinc-500 uppercase tracking-widest font-sans">
              {isDataLoading ? 'Loading Data' : 'Complete'}
            </span>
            <span className="text-3xl md:text-6xl tabular-nums stylish-font text-zinc-900">
              {progress}%
            </span>
          </div>

          <div className="w-full h-[2px] bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-900 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default PageLoader;
