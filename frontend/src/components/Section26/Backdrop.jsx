import React from 'react';

const LAMP_MASK =
  "linear-gradient(to bottom, #000 0%, #000 55%, rgba(0,0,0,0.6) 78%, transparent 100%)";

export const Backdrop = () => (
  <div className="section26-backdrop-container">
    {/* Desktop Ceiling Lamp + Arcs + Film Texture */}
    <img
      aria-hidden="true"
      src="/section-26/bg-shapes-desktop.png"
      alt=""
      className="section26-bg-lamp"
      style={{
        maskImage: LAMP_MASK,
        WebkitMaskImage: LAMP_MASK,
      }}
    />
    <img
      aria-hidden="true"
      src="/section-26/arcs-desktop.png"
      alt=""
      className="section26-bg-arcs"
    />
    <img
      aria-hidden="true"
      src="/section-26/texture-desktop.png"
      alt=""
      className="section26-bg-texture"
    />
  </div>
);

export default Backdrop;
