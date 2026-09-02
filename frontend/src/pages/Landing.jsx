import React from 'react';
import Footer from '../components/Footer';
import Section26Hero from '../components/Section26/Section26Hero';
import InteractiveHeroCanvas from '../components/InteractiveLines';

const IndianFlag = () => (
  <span className="sirnik-flag-badge" title="India" aria-label="India" style={{ display: 'inline-flex', alignItems: 'center' }}>
    <svg
      width="22"
      height="15"
      viewBox="0 0 30 20"
      style={{
        borderRadius: '2px',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
        display: 'block',
        overflow: 'hidden'
      }}
    >
      <rect width="30" height="6.67" y="0" fill="#FF9933" />
      <rect width="30" height="6.67" y="6.67" fill="#FFFFFF" />
      <rect width="30" height="6.67" y="13.33" fill="#128807" />
      <circle cx="15" cy="10" r="2.2" fill="none" stroke="#000080" strokeWidth="0.5" />
      <circle cx="15" cy="10" r="0.5" fill="#000080" />
      {[...Array(12)].map((_, i) => (
        <line
          key={i}
          x1={15 + 2.2 * Math.cos((i * Math.PI) / 6)}
          y1={10 + 2.2 * Math.sin((i * Math.PI) / 6)}
          x2={15 - 2.2 * Math.cos((i * Math.PI) / 6)}
          y2={10 - 2.2 * Math.sin((i * Math.PI) / 6)}
          stroke="#000080"
          strokeWidth="0.25"
        />
      ))}
    </svg>
  </span>
);

const Landing = () => {
  return (
    <div className="okaydev-landing">
      <Section26Hero />

      <div className="interactive-lines-transition-wrapper">
        <InteractiveHeroCanvas
          backgroundColor="transparent"
          lineColor="rgb(255, 140, 70)"
          lineWidth={1.5}
          lineCount={76}
          speed={5}
          glow={11}
          interactive={true}
        />
      </div>

      <section className="aegis-team-section" id="team">
        <div className="team-watermark">AEGIS</div>

        <div className="aegis-team-inner">
          <h2 className="team-giant-top">
            Team made<br />visible
          </h2>

          <div className="team-editorial-stage">
            <div className="team-philosophy-center">
              Small team. Clear ideas. Expressed with cryptographic clarity and control.
            </div>

            <div className="team-philosophy-left">
              <div><strong>Observe</strong> how security takes form.</div>
              <div className="mt-sm"><strong>Touch</strong> the architecture behind the visuals.</div>
              <div className="mt-sm"><strong>See</strong> how thinking becomes interface.</div>
            </div>

            {/* Left Card: Swatantra Yadav */}
            <div className="team-editorial-card team-card-left">
              <div className="team-video-portrait">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="https://cdn.prod.website-files.com/66387c0fa39192a87e403b2a/6960e8951d5da3df551ad0a2_avatar-4_poster.0000000.jpg"
                >
                  <source src="https://cdn.prod.website-files.com/66387c0fa39192a87e403b2a/6960e8951d5da3df551ad0a2_avatar-4_mp4.mp4" type="video/mp4" />
                  <source src="https://cdn.prod.website-files.com/66387c0fa39192a87e403b2a/6960e8951d5da3df551ad0a2_avatar-4_webm.webm" type="video/webm" />
                </video>
              </div>
              <div className="sirnik-card-label">
                <div className="sirnik-label-name">Swatantra Yadav</div>
                <div className="sirnik-label-meta">
                  <IndianFlag />
                  <span className="sirnik-label-role">Project Lead, Backend Engineer</span>
                </div>
              </div>
            </div>

            {/* Right Card: Vishek Tyagi */}
            <div className="team-editorial-card team-card-right">
              <div className="team-video-portrait">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="https://cdn.prod.website-files.com/66387c0fa39192a87e403b2a/6960e77b08248983a3a43fa3_avatar-3_poster.0000000.jpg"
                >
                  <source src="https://cdn.prod.website-files.com/66387c0fa39192a87e403b2a/6960e77b08248983a3a43fa3_avatar-3_mp4.mp4" type="video/mp4" />
                  <source src="https://cdn.prod.website-files.com/66387c0fa39192a87e403b2a/6960e77b08248983a3a43fa3_avatar-3_webm.webm" type="video/webm" />
                </video>
              </div>
              <div className="sirnik-card-label">
                <div className="sirnik-label-name">Vishek Tyagi</div>
                <div className="sirnik-label-meta">
                  <IndianFlag />
                  <span className="sirnik-label-role">Project Member, Auth Backend</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Editorial Section — Balanced Architectural Composition */}
          <div className="team-seal-wrap mt-3xl">
            <div className="team-bottom-editorial-grid">
              <h4 className="team-giant-bottom" style={{ margin: 0, textAlign: 'left' }}>
                security engineered<br />
                into identity
              </h4>

              <div className="team-editorial-meta-block">
                <div className="editorial-meta-pillars">
                  <div className="editorial-pillar-item">
                    <span className="pillar-index">1</span>
                    <div className="pillar-content">
                      <strong>Argon2id Key Derivation</strong>
                      <span>Memory-hard password hashing engineered for post-quantum threat resistance.</span>
                    </div>
                  </div>
                  <div className="editorial-pillar-item">
                    <span className="pillar-index">2</span>
                    <div className="pillar-content">
                      <strong>Deterministic RBAC Matrix</strong>
                      <span>Fine-grained permissions and instant Redis-backed token revocation.</span>
                    </div>
                  </div>
                  <div className="editorial-pillar-item">
                    <span className="pillar-index">3</span>
                    <div className="pillar-content">
                      <strong>Tamper-Evident SHA-256 Audit Chain</strong>
                      <span>Cryptographic hash-chained telemetry ensuring non-repudiation and forensic auditability.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section >

      <Footer />
    </div >
  );
};

export default Landing;
