import React from 'react';
import Footer from '../components/Footer';
import Section26Hero from '../components/Section26/Section26Hero';
import InteractiveHeroCanvas from '../components/InteractiveLines';

const Landing = () => {
  return (
    <div className="okaydev-landing">
      {/* ── Section 26 Hero (Visionary Wellness / Exact diip3sh Component) ── */}
      <Section26Hero />

      {/* ── Interactive Lines Transition Bridge (Framer InteractiveLinesV2) ── */}
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

      {/* Team Made Visible Section (Ref: Exact sirnik.co Editorial Layout) */}
      <section className="aegis-team-section" id="team">
        {/* Background Watermark Characters */}
        <div className="team-watermark">AEGIS</div>

        <div className="aegis-team-inner">
          {/* Top Editorial Giant Heading */}
          <h2 className="team-giant-top">
            Team made<br />visible
          </h2>

          {/* Staggered Cards Stage with Staggered Overlap */}
          <div className="team-editorial-stage">
            {/* Philosophy Notes */}
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
                  <span>India</span>
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
                  <span>India</span>
                  <span className="sirnik-label-role">Co-Lead, IAM & UI Systems</span>
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
                <div className="editorial-meta-lead">
                  Every transaction authenticated. Every permission verified. Every audit log cryptographically chained.
                </div>
                <div className="editorial-meta-pillars">
                  <div className="editorial-pillar-item">
                    <span className="pillar-index">01</span>
                    <div className="pillar-content">
                      <strong>Argon2id Key Derivation</strong>
                      <span>Memory-hard password hashing engineered for post-quantum threat resistance.</span>
                    </div>
                  </div>
                  <div className="editorial-pillar-item">
                    <span className="pillar-index">02</span>
                    <div className="pillar-content">
                      <strong>Deterministic RBAC Matrix</strong>
                      <span>Fine-grained permissions and instant Redis-backed token revocation.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cut Scene Transition to AEGIS Trionn-Style Striped Footer ── */}
      <Footer />
    </div>
  );
};

export default Landing;
