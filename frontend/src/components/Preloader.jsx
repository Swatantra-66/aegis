import React, { useState, useEffect, useRef } from 'react';

const Preloader = ({ onComplete }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExited, setIsExited] = useState(false);

  const fillRef = useRef(null);
  const haloRef = useRef(null);
  const counterRef = useRef(null);

  useEffect(() => {
    let animFrameId;
    let isCancelled = false;

    // Pre-decode logo image to guarantee zero texture-upload jank during animation
    const preloadImg = new Image();
    preloadImg.src = '/aegis-logo-new.png';

    const startAnimation = () => {
      if (isCancelled) return;
      const startTime = performance.now();
      const duration = 2000; // Ultra-smooth 2.0s cinematic pace

      const updateProgress = (currentTime) => {
        if (isCancelled) return;
        const elapsed = currentTime - startTime;
        const t = Math.min(elapsed / duration, 1);

        // Smooth cubic easing for uninterrupted, fluid motion
        const ease = t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const currentPercent = Math.min(Math.round(ease * 100), 100);

        // Direct DOM updates: 0 React re-renders, 0 frame drops
        if (fillRef.current) {
          fillRef.current.style.clipPath = `inset(${100 - currentPercent}% 0 0 0)`;
          fillRef.current.style.webkitClipPath = `inset(${100 - currentPercent}% 0 0 0)`;
        }
        if (haloRef.current) {
          haloRef.current.style.opacity = `${(currentPercent / 100) * 0.85}`;
          haloRef.current.style.transform = `scale(${0.85 + (currentPercent / 100) * 0.25}) translateZ(0)`;
        }
        if (counterRef.current) {
          counterRef.current.textContent = `${currentPercent}%`;
        }

        if (t < 1) {
          animFrameId = requestAnimationFrame(updateProgress);
        } else {
          if (counterRef.current) counterRef.current.textContent = '100%';
          if (fillRef.current) {
            fillRef.current.style.clipPath = 'inset(0% 0 0 0)';
            fillRef.current.style.webkitClipPath = 'inset(0% 0 0 0)';
          }

          // Brief pause at 100% then trigger smooth slide up exit
          setTimeout(() => {
            if (isCancelled) return;
            setIsLoaded(true);
            if (onComplete) onComplete();
            setTimeout(() => {
              if (isCancelled) return;
              setIsExited(true);
            }, 750);
          }, 180);
        }
      };

      animFrameId = requestAnimationFrame(updateProgress);
    };

    if (preloadImg.decode) {
      preloadImg.decode().then(startAnimation).catch(startAnimation);
    } else {
      startAnimation();
    }

    return () => {
      isCancelled = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
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
          {/* Organic circular refraction halo behind logo */}
          <div
            ref={haloRef}
            className="preloader-radial-halo"
            style={{
              opacity: 0,
              transform: 'scale(0.85) translateZ(0)',
            }}
          />

          {/* Inactive / Dim Background Logo */}
          <img
            src="/aegis-logo-new.png"
            alt="Aegis IAM Logo Base"
            className="preloader-logo-img preloader-logo-base"
            fetchPriority="high"
            decoding="async"
          />

          {/* Active Liquid Rising Full Logo */}
          <img
            ref={fillRef}
            src="/aegis-logo-new.png"
            alt="Aegis IAM Logo Fill"
            className="preloader-logo-img preloader-logo-fill"
            fetchPriority="high"
            decoding="async"
            style={{
              clipPath: 'inset(100% 0 0 0)',
              WebkitClipPath: 'inset(100% 0 0 0)',
            }}
          />
        </div>

        {/* Counter Percentage Text */}
        <div ref={counterRef} className="preloader-counter-text">
          0%
        </div>
      </div>
    </div>
  );
};

export default Preloader;
