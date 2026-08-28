import React, { useState, useEffect } from 'react';

const Preloader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExited, setIsExited] = useState(false);

  useEffect(() => {
    // Mid-pace loader: ~1.8s total duration with natural easing
    const startTime = performance.now();
    const duration = 1800; // 1.8 seconds (mid pace)

    const updateProgress = (currentTime) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Smooth custom easing
      const easeProgress = t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const currentPercent = Math.min(Math.round(easeProgress * 100), 100);
      setProgress(currentPercent);

      if (t < 1) {
        requestAnimationFrame(updateProgress);
      } else {
        setProgress(100);
        // Brief pause at 100% then trigger slide up exit
        setTimeout(() => {
          setIsLoaded(true);
          if (onComplete) onComplete();
          setTimeout(() => {
            setIsExited(true);
          }, 750);
        }, 220);
      }
    };

    const animFrame = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animFrame);
  }, [onComplete]);

  if (isExited) return null;

  return (
    <div
      className={`aegis-preloader-root ${isLoaded ? 'preloader-exit' : ''}`}
      aria-hidden={isLoaded}
    >
      <div className="preloader-center-stage">
        {/* AEGIS Shield Logo with Bottom-to-Top Liquid Fill */}
        <div className="preloader-logo-container">
          {/* Inactive / Dim Background Logo */}
          <img
            src="/aegis-logo.png"
            alt="Aegis IAM Logo Base"
            className="preloader-logo-img preloader-logo-base"
          />

          {/* Active Liquid Rising Full Logo */}
          <img
            src="/aegis-logo.png"
            alt="Aegis IAM Logo Fill"
            className="preloader-logo-img preloader-logo-fill"
            style={{
              clipPath: `inset(${100 - progress}% 0 0 0)`,
              WebkitClipPath: `inset(${100 - progress}% 0 0 0)`,
            }}
          />
        </div>

        {/* Counter Percentage Text */}
        <div className="preloader-counter-text">
          {progress}%
        </div>
      </div>
    </div>
  );
};

export default Preloader;
