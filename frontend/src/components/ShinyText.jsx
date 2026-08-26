import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const Sparkle = () => (
  <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M93.781 51.578C95 50.969 96 49.359 96 48c0-1.375-1-2.969-2.219-3.578 0 0-22.868-1.514-31.781-10.422-8.915-8.91-10.438-31.781-10.438-31.781C50.969 1 49.375 0 48 0s-2.969 1-3.594 2.219c0 0-1.5 22.87-10.406 31.781-8.908 8.913-31.781 10.422-31.781 10.422C1 45.031 0 46.625 0 48c0 1.359 1 2.969 2.219 3.578 0 0 22.873 1.51 31.781 10.422 8.906 8.911 10.406 31.781 10.406 31.781C45.031 95 46.625 96 48 96s2.969-1 3.562-2.219c0 0 1.523-22.871 10.438-31.781 8.913-8.908 31.781-10.422 31.781-10.422Z" />
  </svg>
);

export default function ShinyText({
  text = 'AEGIS',
  fontFamily = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize = 28,
  fontWeight = 900,
  letterSpacing = '0.06em',
  textColor = '#000000',
  shadowColor = 'rgba(0, 0, 0, 0.3)',
  glareColor = 'rgba(255, 255, 255, 0.9)',
  glareSpeed = 1.2,
  glareDirection = 'left-to-right',
  transition = { type: 'spring', stiffness: 400, damping: 25 },
  style,
  className,
}) {
  const resolvedFontFamily =
    typeof fontFamily === 'string'
      ? fontFamily
      : fontFamily?.fontFamily || "'Plus Jakarta Sans', -apple-system, sans-serif";

  const numFontSize =
    typeof fontSize === 'number'
      ? fontSize
      : parseInt(fontSize, 10) || 28;

  const resolvedFontWeight =
    typeof fontWeight === 'number' || typeof fontWeight === 'string'
      ? fontWeight
      : 900;

  const variants = useMemo(() => {
    let hoverPos = 1;
    let restPos = 0;
    if (glareDirection === 'right-to-left') {
      hoverPos = 0;
      restPos = 1;
    }
    return {
      rest: {
        '--hover': 0.25,
        '--pos': restPos,
        transition: {
          '--hover': transition,
          '--pos': { duration: 0 },
        },
      },
      hover: {
        '--hover': 1,
        '--pos': hoverPos,
        transition: {
          '--hover': transition,
          '--pos': { duration: 1 / glareSpeed, ease: 'linear' },
        },
      },
      tap: {
        '--hover': 0,
      },
    };
  }, [glareDirection, glareSpeed, transition]);

  return (
    <div
      className={`shiny-text-root ${className || ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        ...style,
      }}
    >
      <motion.div
        className="shiny-sparkle-button"
        style={{
          fontFamily: resolvedFontFamily,
          fontWeight: resolvedFontWeight,
          letterSpacing,
          '--color': textColor,
          '--shadow': shadowColor,
          '--glare': glareColor,
          '--font-size': `${numFontSize}px`,
        }}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        variants={variants}
      >
        <Sparkle />
        <Sparkle />
        <Sparkle />
        <Sparkle />
        <Sparkle />
        <span>{text}</span>
        <span aria-hidden="true">{text}</span>
      </motion.div>
    </div>
  );
}

export { ShinyText };
