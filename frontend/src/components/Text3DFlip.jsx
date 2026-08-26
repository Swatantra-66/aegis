import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAnimate } from 'framer-motion';

const HAS_SEGMENTER = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

const splitIntoCharacters = (text) => {
  if (HAS_SEGMENTER) {
    const segmenter = new Intl.Segmenter('en', {
      granularity: 'grapheme',
    });
    return Array.from(segmenter.segment(text), ({ segment }) => segment);
  }
  return Array.from(text);
};

const SECOND_FACE_TRANSFORMS = {
  top: 'rotateX(-90deg) translateZ(0.5em)',
  right: 'rotateY(90deg) translateX(50%) rotateY(-90deg) translateX(-50%) rotateY(-90deg) translateX(50%)',
  bottom: 'rotateX(90deg) translateZ(0.5em)',
  left: 'rotateY(90deg) translateX(50%) rotateY(-90deg) translateX(-50%) rotateY(-90deg) translateX(50%)',
};

const FRONT_FACE_TRANSFORMS = {
  top: 'translateZ(0.5em)',
  bottom: 'translateZ(0.5em)',
  left: 'rotateY(90deg) translateX(50%) rotateY(-90deg)',
  right: 'rotateY(-90deg) translateX(50%) rotateY(90deg)',
};

const CONTAINER_TRANSFORMS = {
  top: 'translateZ(-0.5em) rotateX(0deg)',
  bottom: 'translateZ(-0.5em) rotateX(0deg)',
  left: 'rotateY(90deg) translateX(50%) rotateY(-90deg) rotateY(0deg)',
  right: 'rotateY(90deg) translateX(50%) rotateY(-90deg) rotateY(0deg)',
};

const FLIPPED_TRANSFORMS = {
  top: 'translateZ(-0.5em) rotateX(90deg)',
  bottom: 'translateZ(-0.5em) rotateX(-90deg)',
  left: 'rotateY(90deg) translateX(50%) rotateY(-90deg) rotateY(-90deg)',
  right: 'rotateY(90deg) translateX(50%) rotateY(-90deg) rotateY(90deg)',
};

const DEFAULT_FONT = {
  fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
  fontWeight: 900,
  fontSize: '1.75rem',
  letterSpacing: '0.06em',
  lineHeight: '1em',
  textAlign: 'left',
};

const DEFAULT_TRANSITION = {
  type: 'spring',
  damping: 30,
  stiffness: 300,
  mass: 1,
};

const CharBox = memo(({ char, color, flipColor, rotateDirection }) => (
  <span
    className="text-3d-flip-char"
    style={{
      display: 'inline-block',
      transformStyle: 'preserve-3d',
      transform: CONTAINER_TRANSFORMS[rotateDirection],
      WebkitTransform: CONTAINER_TRANSFORMS[rotateDirection],
    }}
  >
    <span
      style={{
        position: 'relative',
        display: 'block',
        height: '1em',
        lineHeight: '1em',
        color,
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: FRONT_FACE_TRANSFORMS[rotateDirection],
        WebkitTransform: FRONT_FACE_TRANSFORMS[rotateDirection],
      }}
    >
      {char}
    </span>
    <span
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        display: 'block',
        height: '1em',
        lineHeight: '1em',
        color: flipColor || color,
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: SECOND_FACE_TRANSFORMS[rotateDirection],
        WebkitTransform: SECOND_FACE_TRANSFORMS[rotateDirection],
      }}
    >
      {char}
    </span>
  </span>
));

CharBox.displayName = 'CharBox';

export function Text3DFlip({
  text = 'AEGIS',
  font = DEFAULT_FONT,
  color = '#000000',
  flipColor = '#7085ff',
  staggerDuration = 0.04,
  staggerFrom = 'first',
  animation = 'hover',
  tag = 'span',
  transition = DEFAULT_TRANSITION,
  rotateDirection = 'top',
  style,
  className,
}) {
  const content = text || 'AEGIS';
  const isAnimatingRef = useRef(false);
  const isMountedRef = useRef(false);
  const canTriggerHoverRef = useRef(true);
  const [scope, animate] = useAnimate();

  const restingTransform = CONTAINER_TRANSFORMS[rotateDirection];
  const flippedTransform = FLIPPED_TRANSFORMS[rotateDirection];

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isAnimatingRef.current = false;
    };
  }, []);

  const characters = useMemo(() => {
    const words = content.split(' ');
    return words.map((word, index) => ({
      characters: splitIntoCharacters(word),
      needsSpace: index !== words.length - 1,
    }));
  }, [content]);

  const charOffsets = useMemo(() => {
    const offsets = [0];
    for (const word of characters) {
      offsets.push(offsets[offsets.length - 1] + word.characters.length);
    }
    return offsets;
  }, [characters]);

  const getStaggerDelay = useCallback(
    (index, totalChars) => {
      if (staggerFrom === 'first') return index * staggerDuration;
      if (staggerFrom === 'last') {
        return (totalChars - 1 - index) * staggerDuration;
      }
      if (staggerFrom === 'center') {
        const center = Math.floor(totalChars / 2);
        return Math.abs(center - index) * staggerDuration;
      }
      const randomIndex = Math.floor(Math.random() * totalChars);
      return Math.abs(randomIndex - index) * staggerDuration;
    },
    [staggerDuration, staggerFrom]
  );

  const playAnimation = useCallback(async () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    try {
      const totalChars = characters.reduce(
        (sum, word) => sum + word.characters.length,
        0
      );
      const delays = Array.from({ length: totalChars }, (_, index) =>
        getStaggerDelay(index, totalChars)
      );

      await animate(
        '.text-3d-flip-char',
        { transform: flippedTransform },
        {
          ...transition,
          delay: (index) => delays[index] ?? 0,
        }
      );

      if (!isMountedRef.current) return;

      await animate(
        '.text-3d-flip-char',
        { transform: restingTransform },
        { duration: 0, delay: 0 }
      );
    } catch {
      // Ignore cancelled animation
    } finally {
      if (isMountedRef.current) {
        isAnimatingRef.current = false;
      }
    }
  }, [
    animate,
    characters,
    flippedTransform,
    getStaggerDelay,
    restingTransform,
    transition,
  ]);

  useEffect(() => {
    if (animation !== 'enter') return;
    playAnimation();
  }, [animation, content, playAnimation]);

  const handlePointerEnter = () => {
    if (animation !== 'hover' || !canTriggerHoverRef.current) return;
    canTriggerHoverRef.current = false;
    playAnimation();
  };

  const handlePointerLeave = () => {
    canTriggerHoverRef.current = true;
  };

  const mergedFont = { ...DEFAULT_FONT, ...font };
  const textAlign = mergedFont.textAlign || 'left';
  const justifyContent =
    textAlign === 'center'
      ? 'center'
      : textAlign === 'right' || textAlign === 'end'
        ? 'flex-end'
        : 'flex-start';

  const ComponentTag = tag;

  return (
    <div
      className={`text-3d-flip-wrapper ${className || ''}`}
      onPointerEnter={animation === 'hover' ? handlePointerEnter : undefined}
      onPointerLeave={animation === 'hover' ? handlePointerLeave : undefined}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <ComponentTag
        ref={scope}
        aria-label={content}
        style={{
          ...mergedFont,
          position: 'relative',
          margin: 0,
          display: 'inline-flex',
          flexWrap: 'wrap',
          justifyContent,
          perspective: 800,
          perspectiveOrigin: 'center center',
          cursor: animation === 'hover' ? 'pointer' : undefined,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          color,
        }}
      >
        {characters.map((wordObject, wordIndex) => (
          <span
            key={wordIndex}
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              transformStyle: 'preserve-3d',
            }}
          >
            {wordObject.characters.map((char, charIndex) => (
              <CharBox
                key={charOffsets[wordIndex] + charIndex}
                char={char}
                color={color}
                flipColor={flipColor}
                rotateDirection={rotateDirection}
              />
            ))}
            {wordObject.needsSpace ? (
              <span style={{ whiteSpace: 'pre' }}> </span>
            ) : null}
          </span>
        ))}
      </ComponentTag>
    </div>
  );
}

export default Text3DFlip;
