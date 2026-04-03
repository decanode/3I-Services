import React, { useState, useEffect } from 'react';

const PageLoader = ({ pageName = 'Loading', isDataLoading = false, onComplete, duration = 2000 }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [loaderComplete, setLoaderComplete] = useState(false);

  useEffect(() => {
    const startTime = Date.now();

    const updateProgress = () => {
      const elapsedTime = Date.now() - startTime;
      const currentProgress = Math.min((elapsedTime / duration) * 100, 100);

      setProgress(Math.floor(currentProgress));

      if (currentProgress < 100) {
        setTimeout(updateProgress, 30);
      } else {
        setLoaderComplete(true);
      }
    };

    const initialTimeout = setTimeout(updateProgress, 30);
    return () => clearTimeout(initialTimeout);
  }, [duration]);

  // When loader is complete AND data is no longer loading, trigger exit
  useEffect(() => {
    if (loaderComplete && !isDataLoading) {
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 1000);
      }, 500);
    }
  }, [loaderComplete, isDataLoading, onComplete]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');

        .stylish-font {
          font-family: 'Playfair Display', serif;
          font-style: italic;
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1.1;
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

        <div className="flex-1 flex flex-col items-center justify-center px-4 w-full">
          <div className="text-mask overflow-hidden pb-4 relative w-fit mx-auto pr-4">
            <h1
              className="reveal-text stylish-font text-[5rem] md:text-[9rem] lg:text-[14rem] text-center text-zinc-300"
            >
              {pageName}
            </h1>

            <h1
              className="reveal-text absolute top-0 left-0 w-full stylish-font text-[5rem] md:text-[9rem] lg:text-[14rem] text-center text-zinc-900 transition-all duration-300 ease-out pr-4"
              style={{
                clipPath: `inset(0 ${100 - progress}% 0 0)`
              }}
            >
              {pageName}
            </h1>
          </div>
        </div>

        <div className="w-full p-6 md:p-10 flex flex-col gap-4">
          <div className="flex justify-between items-end w-full">
            <span className="text-xs md:text-sm text-zinc-500 uppercase tracking-widest font-sans">
              {isDataLoading ? 'Loading Data' : 'System Initialization'}
            </span>
            <span className="text-4xl md:text-6xl font-light tabular-nums stylish-font not-italic text-zinc-900">
              {isDataLoading && progress === 100 ? '100' : progress}%
            </span>
          </div>

          <div className="w-full h-[2px] bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-900 transition-all duration-300 ease-out"
              style={{ width: isDataLoading && progress === 100 ? '100%' : `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default PageLoader;