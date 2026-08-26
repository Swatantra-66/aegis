import React, { useEffect, useRef } from "react";

const map = (v, a, b, c, d) => ((v - a) / (b - a)) * (d - c) + c;
const TWO_PI = 2 * Math.PI;

function parseRGB(str) {
  if (!str) return { r: 255, g: 255, b: 255 };
  const m = str.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const [r, g, b] = m[1].split(",").map((n) => parseInt(n.trim(), 10));
    return { r, g, b };
  }
  let hex = str.replace(/^#/, "");
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (hex.length >= 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }
  return { r: 255, g: 255, b: 255 };
}

function useCanvasAnimation({
  alpha = true,
  deferStart = false,
  onSetup,
  onResize,
  onDraw,
  resizeDebounce = 100,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const stateRef = useRef({
    width: 0,
    height: 0,
    dpr: 1,
    isVisible: true,
    isPageVisible: true,
    animationId: 0,
    frameCount: 0,
  });
  const onDrawRef = useRef(onDraw);
  onDrawRef.current = onDraw;
  const onSetupRef = useRef(onSetup);
  onSetupRef.current = onSetup;
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha });
    if (!ctx) return;
    const st = stateRef.current;

    const setup = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      st.width = rect.width;
      st.height = rect.height;
      st.dpr = dpr;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const loop = () => {
      st.frameCount += 1;
      if (onDrawRef.current(ctx, st) !== false) {
        st.animationId = requestAnimationFrame(loop);
      } else {
        st.animationId = 0;
      }
    };

    let canStart = !deferStart;
    const start = () => {
      if (!canStart || st.animationId || !st.isVisible || !st.isPageVisible) return;
      st.animationId = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (st.animationId) {
        cancelAnimationFrame(st.animationId);
        st.animationId = 0;
      }
    };

    let cancelIdle;
    if (deferStart) {
      const startNow = () => {
        canStart = true;
        cancelIdle = undefined;
        start();
      };
      if (typeof requestIdleCallback !== "undefined") {
        const id = requestIdleCallback(startNow);
        cancelIdle = () => cancelIdleCallback(id);
      } else {
        const id = setTimeout(startNow, 150);
        cancelIdle = () => clearTimeout(id);
      }
    }

    let resizeTimer;
    const onResizeEv = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setup();
        onResizeRef.current?.(ctx, st);
      }, resizeDebounce);
    };

    const onPageVis = () => {
      st.isPageVisible = document.visibilityState === "visible";
      st.isVisible && st.isPageVisible ? start() : stop();
    };

    const io = new IntersectionObserver(
      (entries) => {
        st.isVisible = entries[0]?.isIntersecting ?? true;
        st.isVisible && st.isPageVisible ? start() : stop();
      },
      { threshold: 0 }
    );

    setup();
    io.observe(container);
    onSetupRef.current?.(ctx, st);
    if (!deferStart) start();

    window.addEventListener("resize", onResizeEv, { passive: true });
    document.addEventListener("visibilitychange", onPageVis);

    return () => {
      stop();
      cancelIdle?.();
      clearTimeout(resizeTimer);
      io.disconnect();
      window.removeEventListener("resize", onResizeEv);
      document.removeEventListener("visibilitychange", onPageVis);
    };
  }, [alpha, deferStart, resizeDebounce]);

  return { containerRef, canvasRef, stateRef };
}

export default function InteractiveHeroCanvas({
  backgroundColor = "transparent",
  lineColor = "rgb(255, 120, 50)",
  lineWidth = 1.5,
  lineCount = 76,
  speed = 6,
  glow = 10,
  interactive = true,
  style,
  className,
}) {
  const mouseRef = useRef({ y: 0, targetY: 0 });
  const { containerRef, canvasRef, stateRef } = useCanvasAnimation({
    alpha: true,
    deferStart: false,
    onSetup: (_ctx, st) => {
      mouseRef.current.targetY = st.height / 2;
      mouseRef.current.y = st.height / 2;
    },
    onDraw: (e, t) => {
      const { width: r, height: i, frameCount: fc } = t;
      const mouse = mouseRef.current;
      mouse.y = mouse.y + (mouse.targetY - mouse.y) * 0.1;

      // Clear Canvas
      if (backgroundColor === "transparent") {
        e.clearRect(0, 0, r, i);
      } else {
        e.fillStyle = backgroundColor;
        e.fillRect(0, 0, r, i);
      }

      const isMobile = r < 768;
      const u = 55e3 / glow;
      const { r: cr, g: cg, b: cb } = parseRGB(lineColor);

      e.save();
      e.lineWidth = lineWidth;
      e.translate(r / 2, i);

      const f = interactive ? map(mouse.y, 0, i, 1.2, -1.2) : 0;
      const m = Math.max(320, Math.min(1440, r));
      const rate = map(m, 320, 1440, 0.002, 0.0005) * (speed / 5);
      const p = fc * rate;
      const h = r / 2;
      const x = isMobile ? Math.round(lineCount * 0.6) : lineCount;

      for (let k = 0; k < x; k++) {
        let ang = map(k, 0, x, 0, Math.PI) + p;
        ang %= Math.PI;
        const l = (Math.tan(ang) - f) * i;
        const a = Math.abs(l) / 2;
        const yCenter = -i / 2 + l / 2;
        const bright = Math.max(0, Math.min(255, map(Math.abs(l), 0, u, -20, 255))) / 255;
        if (bright <= 0) continue;

        e.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${bright})`;

        if (a > 499999.5) {
          e.beginPath();
          e.moveTo(-h, -i / 2);
          e.lineTo(h, -i / 2);
          e.stroke();
          continue;
        }

        const c2 = Math.acos(Math.min(1, (h + 50) / a));
        const segTotal = Math.max(Math.ceil(a / 120), 200);
        const spans = [
          [c2, Math.PI - c2],
          [Math.PI + c2, TWO_PI - c2],
        ];

        for (const [start, end] of spans) {
          const span = end - start;
          const n3 = Math.max(Math.ceil((span / TWO_PI) * segTotal), 60);
          const step = span / n3;
          e.beginPath();
          for (let s = 0; s <= n3; s++) {
            const aa = start + step * s;
            const xx = Math.cos(aa) * a;
            const yy = yCenter + Math.sin(aa) * a;
            s === 0 ? e.moveTo(xx, yy) : e.lineTo(xx, yy);
          }
          e.stroke();
        }
      }
      e.restore();
    },
  });

  useEffect(() => {
    if (!interactive) return;
    const container = containerRef.current;
    if (!container) return;
    let rect = container.getBoundingClientRect();
    const onMove = (ev) => {
      if (stateRef.current.isVisible) mouseRef.current.targetY = ev.clientY - rect.top;
    };
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rect = container.getBoundingClientRect();
        rafId = 0;
      });
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [interactive, containerRef, stateRef]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: "none",
        ...style,
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

export { InteractiveHeroCanvas };
