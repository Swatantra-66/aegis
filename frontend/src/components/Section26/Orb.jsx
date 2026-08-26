import React, { useEffect, useRef } from "react";

const CONFIG_JSON = JSON.stringify({
  version: 1,
  model: { scale: 1 },
  background: { enabled: false, color: "#0a0a0f" },
  camera: { fov: 45, height: 9, distance: 100 },
  lighting: { brightness: 100, rotation: 0, fill: 0 },
  environment: null,
  preset: {
    type: "heatmap",
    params: {
      cool: "#2b1d7a",
      mid: "#ff5a1f",
      hot: "#fff3b0",
      contour: 55,
      relief: 70,
      innerGlow: 45,
      outerGlow: 0,
      angle: 45,
      grain: 20,
      speed: 40,
      scale: 100,
    },
    seed: 24301,
  },
  material: { type: "original", params: {} },
  effects: [],
  animation: {
    enabled: true,
    entries: [
      {
        id: "rotation",
        type: "rotation",
        enabled: true,
        trigger: "auto",
        threshold: 0.4,
        loop: true,
        params: {
          duration: 8,
          angle: 360,
          axisX: 0,
          axisY: 1,
          axisZ: 0,
        },
      },
    ],
  },
  interactions: {
    sensitivity: 0,
    momentum: 0,
    draggable: false,
    snapBack: false,
    maxRotation: 0,
    cursorFollow: false,
    zoom: false,
    zoomRange: 0,
  },
  post: {
    bloom: {
      enabled: false,
      intensity: 60,
      threshold: 55,
      radius: 40,
      flare: 0,
      streak: 50,
    },
  },
});

export const Orb = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!document.querySelector('script[src="https://www.thrine.app/embed/v1.js"]')) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = "https://www.thrine.app/embed/v1.js";
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className="section26-orb-stage-wrapper" ref={containerRef}>
      <model-embed
        src="https://pub-eef027e83d7c4fc7aa28c9dcd06d7f89.r2.dev/models/templates/starburst-symphony.glb"
        alt="Starburst Symphony"
        style={{
          display: "block",
          width: "100%",
          maxWidth: "850px",
          aspectRatio: "1366 / 679",
          pointerEvents: "none",
        }}
      >
        <script
          type="application/json"
          dangerouslySetInnerHTML={{ __html: CONFIG_JSON }}
        />
      </model-embed>
    </div>
  );
};

export default Orb;
