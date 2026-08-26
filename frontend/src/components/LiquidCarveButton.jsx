import React, { useEffect, useLayoutEffect, useRef, useState, useId } from "react";
import { useAnimate, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const radiusFromPercent = (w, h, pct) =>
  (Math.min(w, h) / 2) * (Math.max(0, Math.min(100, pct)) / 100);

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const GOO_STRENGTH = 8;

const FOLLOW_TAU_MIN = 0.02;
const FOLLOW_TAU_MAX = 0.4;
const SQUASH_TAU = 0.09;
const SQUASH_PER_PX_PER_SEC = 0.0011;
const SQUASH_MAX = 1.6;

const WHITE = { r: 255, g: 255, b: 255, a: 1 };

function parseColor(input) {
  if (!input) return WHITE;
  let c = String(input).trim();
  const token = c.match(/^var\([^,]+,\s*(.+)\)$/i);
  if (token) c = token[1].trim();
  if (c[0] === "#") {
    let h = c.slice(1);
    if (h.length === 3 || h.length === 4)
      h = h
        .split("")
        .map((ch) => ch + ch)
        .join("");
    if (h.length !== 6 && h.length !== 8) return WHITE;
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return WHITE;
    return h.length === 6
      ? { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }
      : {
          r: (n >>> 24) & 255,
          g: (n >>> 16) & 255,
          b: (n >>> 8) & 255,
          a: (n & 255) / 255,
        };
  }
  const fn = c.match(/rgba?\(([^)]+)\)/i);
  if (fn) {
    const p = fn[1]
      .split(/[,\s/]+/)
      .filter(Boolean)
      .map(Number);
    if (p.length >= 3 && p.slice(0, 3).every((v) => !Number.isNaN(v)))
      return {
        r: p[0],
        g: p[1],
        b: p[2],
        a: p.length > 3 && !Number.isNaN(p[3]) ? p[3] : 1,
      };
  }
  return WHITE;
}

const opaque = (c) =>
  `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;

export default function LiquidCarveButton(props) {
  const {
    label = "SIGN UP",
    font = {
      fontFamily: "Inter, system-ui, sans-serif",
      fontWeight: 700,
      fontSize: 13,
      lineHeight: "1.2em",
      letterSpacing: "0.04em",
      textAlign: "center",
      textTransform: "uppercase",
    },
    showText = true,
    padding = "9px 24px",
    rounded = 100,
    fill: fillProp,
    textColor: textColorProp,
    colors = { fill: "#000000", textColor: "#FFFFFF" },
    addIcon = false,
    icon = {
      type: "symbol",
      symbol: "→",
      image: "",
      color: "#FFFFFF",
      size: 14,
      padding: 0,
      rounded: 0,
      side: "right",
    },
    gap = 8,
    blob: blobGroup = { size: 55, color: "#FF5A1F", smoothness: 55 },
    blobColor: blobColorLegacy,
    blobSize: blobSizeLegacy,
    link = "",
    to = "",
    onClick,
    transition = {
      type: "tween",
      ease: [0.44, 0, 0.56, 1],
      delay: 0,
      duration: 0.6,
    },
    newTab = false,
    style,
    className = "",
  } = props;

  const navigate = useNavigate();
  const fill = colors?.fill ?? fillProp ?? "#000000";
  const textColor = colors?.textColor ?? textColorProp ?? "#FFFFFF";

  const [scope, animate] = useAnimate();

  const [radiusBox, setRadiusBox] = useState({ w: 0, h: 0 });
  useIsoLayoutEffect(() => {
    const el = scope.current;
    if (!el) return;
    const read = () =>
      setRadiusBox((prev) =>
        prev.w === el.offsetWidth && prev.h === el.offsetHeight
          ? prev
          : { w: el.offsetWidth, h: el.offsetHeight }
      );
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scope]);

  const radiusPx = radiusFromPercent(radiusBox.w, radiusBox.h, rounded);
  const followRef = useRef(null);
  const squashRef = useRef(null);
  const biteRef = useRef(null);
  const hovered = useRef(false);
  const chase = useRef({ x: 0, y: 0, tx: 0, ty: 0, squash: 1, angle: 0 });
  const reducedMotion = useReducedMotion();

  const rawId = useId();
  const uid = rawId.replace(/[:]/g, "");
  const filterId = `goo-${uid}`;
  const maskId = `bite-${uid}`;

  const {
    color: blobColor = blobColorLegacy ?? "#FF5A1F",
    size: blobSize = blobSizeLegacy ?? 55,
    smoothness = 55,
  } = blobGroup;

  const fontStyles = font ?? {};
  const rad = Math.max(0, Math.floor(radiusPx));
  const blob = Math.max(1, Math.floor(blobSize));

  const fillRGB = parseColor(fill);
  const blobRGB = parseColor(blobColor);

  const opts = () =>
    reducedMotion ? { duration: 0 } : transition;

  const live = useRef({ smoothness, reducedMotion });
  live.current = { smoothness, reducedMotion };

  const offset = (e) => {
    const root = scope.current;
    if (!root) return null;
    const r = root.getBoundingClientRect();
    return {
      dx: e.clientX - (r.left + r.width / 2),
      dy: e.clientY - (r.top + r.height / 2),
    };
  };

  useEffect(() => {
    let last = 0;
    const ctrl = animate(0, 1, {
      duration: 1,
      ease: "linear",
      repeat: Infinity,
      onUpdate: () => {
        const now = performance.now();
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
        last = now;

        const st = chase.current;
        const { smoothness: sm, reducedMotion: rm } = live.current;
        const t = Math.max(0, Math.min(100, Math.round(sm))) / 100;
        const tau = FOLLOW_TAU_MIN + t * (FOLLOW_TAU_MAX - FOLLOW_TAU_MIN);

        const k = rm ? 1 : 1 - Math.exp(-dt / tau);
        const dx = (st.tx - st.x) * k;
        const dy = (st.ty - st.y) * k;
        st.x += dx;
        st.y += dy;

        const speed = Math.hypot(dx, dy) / dt;
        const want = rm
          ? 1
          : Math.min(SQUASH_MAX, 1 + speed * SQUASH_PER_PX_PER_SEC);
        st.squash += (want - st.squash) * (1 - Math.exp(-dt / SQUASH_TAU));
        if (speed > 8) st.angle = (Math.atan2(dy, dx) * 180) / Math.PI;

        const f = followRef.current;
        if (f) f.style.transform = `translate(${st.x}px, ${st.y}px)`;
        const q = squashRef.current;
        if (q)
          q.style.transform = `rotate(${st.angle}deg) scale(${st.squash}, ${
            1 / st.squash
          })`;
      },
    });
    return () => ctrl.stop();
  }, [animate]);

  useEffect(() => {
    if (!biteRef.current) return;
    animate(
      biteRef.current,
      { scale: hovered.current ? 1 : 0 },
      { duration: 0 }
    );
  }, [animate, blob, rad]);

  const onEnter = (e) => {
    if (reducedMotion || !biteRef.current) return;
    hovered.current = true;
    const o = offset(e);
    if (o) {
      const st = chase.current;
      st.tx = o.dx;
      st.ty = o.dy;
      st.x = o.dx;
      st.y = o.dy;
      if (followRef.current)
        followRef.current.style.transform = `translate(${o.dx}px, ${o.dy}px)`;
    }
    animate(biteRef.current, { scale: 1 }, opts());
  };

  const onMove = (e) => {
    if (reducedMotion || !hovered.current) return;
    const o = offset(e);
    if (!o) return;
    chase.current.tx = o.dx;
    chase.current.ty = o.dy;
  };

  const onLeave = () => {
    hovered.current = false;
    if (biteRef.current)
      animate(biteRef.current, { scale: 0 }, opts());
  };

  const handleClick = (e) => {
    if (onClick) onClick(e);
    if (to) navigate(to);
  };

  const {
    type: iconKind = "symbol",
    symbol: iconSymbol = "→",
    image: iconImage,
    color: iconColor = "#FFFFFF",
    size: iconSize = 14,
    padding: iconPaddingProp = 0,
    rounded: iconRounded = 0,
    side: iconSide = "right",
  } = icon;
  const iconSrc =
    typeof iconImage === "string"
      ? iconImage
      : iconImage && iconImage.src
      ? iconImage.src
      : "";
  const iconMode = iconKind === "image" && iconSrc ? "image" : "symbol";
  const iconPx = Math.max(1, Math.round(iconSize));
  const iconPadPx = Math.max(0, Math.round(iconPaddingProp));
  const iconRadius = radiusFromPercent(iconPx, iconPx, iconRounded);
  const gapPx = Math.max(0, Math.round(gap));

  const iconEl = !addIcon ? null : iconMode === "image" ? (
    <img
      src={iconSrc}
      alt=""
      aria-hidden
      draggable={false}
      style={{
        width: iconPx,
        height: iconPx,
        margin: iconPadPx,
        objectFit: iconRadius > 0 ? "cover" : "contain",
        borderRadius: Math.min(iconRadius, iconPx / 2),
        display: "block",
        flex: "none",
        pointerEvents: "none",
      }}
    />
  ) : (
    <span
      aria-hidden
      style={{
        fontSize: iconPx,
        margin: iconPadPx,
        lineHeight: 1,
        color: iconColor,
        flex: "none",
        pointerEvents: "none",
      }}
    >
      {iconSymbol}
    </span>
  );

  const isAnchor = Boolean(link);
  const Tag = isAnchor ? "a" : "div";
  const tagProps = isAnchor
    ? {
        href: link,
        target: newTab ? "_blank" : undefined,
        rel: newTab ? "noopener noreferrer" : undefined,
      }
    : {
        role: "button",
        tabIndex: 0,
        onClick: handleClick,
      };

  return (
    <Tag
      {...tagProps}
      ref={scope}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      aria-label={label}
      className={className}
      style={{
        minWidth: 1,
        minHeight: 1,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding,
        cursor: "pointer",
        textDecoration: "none",
        userSelect: "none",
        boxSizing: "border-box",
        overflow: "visible",
        borderRadius: `${rounded}px`,
        ...style,
      }}
    >
      <svg
        aria-hidden="true"
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "visible",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <defs>
          <filter id={filterId}>
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation={GOO_STRENGTH}
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
            />
          </filter>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
            <g
              ref={followRef}
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
              }}
            >
              <g
                ref={squashRef}
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "center",
                }}
              >
                <g
                  ref={biteRef}
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center",
                  }}
                >
                  <circle cx="50%" cy="50%" r={blob / 2} fill="#000" />
                </g>
              </g>
            </g>
          </mask>
        </defs>

        <g filter={`url(#${filterId})`} opacity={blobRGB.a}>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            rx={rad}
            ry={rad}
            fill={opaque(blobRGB)}
          />
        </g>

        <g filter={`url(#${filterId})`} opacity={fillRGB.a}>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            rx={rad}
            ry={rad}
            fill={opaque(fillRGB)}
            mask={`url(#${maskId})`}
          />
        </g>
      </svg>

      <span
        style={{
          position: "relative",
          zIndex: 2,
          display: "inline-flex",
          alignItems: "center",
          lineHeight: 1,
          whiteSpace: "nowrap",
          gap: iconEl && showText ? gapPx : 0,
          flexDirection: iconSide === "right" ? "row-reverse" : "row",
          ...fontStyles,
          color: textColor,
          pointerEvents: "none",
        }}
      >
        {iconEl}
        {showText && <span>{label}</span>}
      </span>
    </Tag>
  );
}
