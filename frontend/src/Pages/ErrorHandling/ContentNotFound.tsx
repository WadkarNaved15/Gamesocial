import React, { useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────
// CATEGORY A — CONTEXTUAL ERROR STATE
// Rendered inside the feed column. No logo, no nav, no takeover.
// ─────────────────────────────────────────────────────────────

export default function ContentNotFound() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;
    let particles: Array<{
      x: number; y: number; r: number; opacity: number;
      vx: number; vy: number; flicker: number; flickerSpeed: number;
    }> = [];
    let driftT = 0;
    let animId: number;

    const resize = () => {
      W = canvas.width = canvas.parentElement?.clientWidth || 600;
      H = canvas.height = canvas.parentElement?.clientHeight || 500;
    };

    const initParticles = () => {
      particles = [];
      const count = Math.min(28, Math.floor((W * H) / 28000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.0 + 0.2,
          opacity: Math.random() * 0.18 + 0.03,
          vx: (Math.random() - 0.5) * 0.09,
          vy: (Math.random() - 0.5) * 0.07,
          flicker: Math.random() * Math.PI * 2,
          flickerSpeed: 0.008 + Math.random() * 0.016,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const ox = Math.sin(driftT * 0.0007) * 40;
      const oy = Math.cos(driftT * 0.0005) * 28;

      const g = ctx.createRadialGradient(
        W * 0.5 + ox, H * 0.44 + oy, 0,
        W * 0.5 + ox, H * 0.44 + oy, Math.max(W, H) * 0.52
      );
      g.addColorStop(0, 'rgba(36,73,62,0.18)');
      g.addColorStop(0.6, 'rgba(20,45,40,0.06)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      particles.forEach(p => {
        p.flicker += p.flickerSpeed;
        const a = p.opacity * (0.65 + 0.35 * Math.sin(p.flicker));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(98,212,174,${a.toFixed(3)})`;
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < -4) p.x = W + 4; if (p.x > W + 4) p.x = -4;
        if (p.y < -4) p.y = H + 4; if (p.y > H + 4) p.y = -4;
      });

      driftT++;
      animId = requestAnimationFrame(draw);
    };

    const onResize = () => { resize(); initParticles(); };
    window.addEventListener('resize', onResize);
    resize(); initParticles(); draw();
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(animId); };
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        @keyframes premiumPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(98,212,174,0.06); }
          50%      { box-shadow: 0 0 60px rgba(98,212,174,0.15); }
        }
        @keyframes glowBreathOuter {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.55; }
        }
        @keyframes glowBreathInner {
          0%, 100% { opacity: 0.15; }
          50%       { opacity: 0.08; }
        }
        @keyframes fragmentA {
          0%, 80%, 100% { transform: translate(0,0) rotate(0deg); opacity: 0; }
          82%            { transform: translate(-4px,2px) rotate(-1.5deg); opacity: 0.5; }
          86%            { transform: translate(3px,-1px) rotate(0.8deg); opacity: 0.4; }
          90%            { transform: translate(-2px,1px); opacity: 0.3; }
          94%            { transform: translate(1px,-2px); opacity: 0.2; }
          98%            { transform: translate(0,0); opacity: 0; }
        }
        @keyframes fragmentB {
          0%, 83%, 100% { transform: translate(0,0); opacity: 0; }
          85%            { transform: translate(5px,-3px); opacity: 0.45; }
          89%            { transform: translate(-4px,2px); opacity: 0.3; }
          93%            { transform: translate(2px,-1px); opacity: 0.15; }
          97%            { transform: translate(0,0); opacity: 0; }
        }
        @keyframes scanLineLoop {
          0%   { top: -2px; opacity: 0; }
          3%   { opacity: 0.5; }
          96%  { opacity: 0.3; }
          100% { top: 100%; opacity: 0; }
        }
        
        .fu { animation: fadeUp 0.8s ease forwards; opacity: 0; }
        .gpulse { animation: glowPulse 3.5s ease-in-out infinite; }
        .premium-pulse { animation: premiumPulse 8s ease-in-out infinite; }
        .glow-outer { animation: glowBreathOuter 4s ease-in-out infinite; }
        .glow-inner { animation: glowBreathInner 4s ease-in-out infinite; }
        .frag-a { animation: fragmentA 7s ease-in-out infinite; animation-delay: 1.4s; }
        .frag-b { animation: fragmentB 7s ease-in-out infinite; animation-delay: 1.6s; }
        .scan-line { animation: scanLineLoop 5s linear infinite; animation-delay: 2s; }
      `}</style>

      {/* Container — fits inside feed column, no takeover */}
      <div className="relative w-full max-w-[600px] mx-auto overflow-hidden rounded-2xl" style={{ minHeight: '70vh' }}>

        {/* Ambient canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none" />

        {/* Noise texture */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none opacity-[0.022]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }}
        />

        {/* Soft vignette */}
        <div className="absolute inset-0 z-[2] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 35%, rgba(0,0,0,0.65) 100%)' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center px-8 py-14" style={{ minHeight: '70vh' }}>

          {/* Status pill */}
          <div
            className="fu inline-flex items-center gap-[7px] text-[10.5px] font-semibold tracking-[0.16em] uppercase text-[#4FA98B] px-3.5 py-[6px] rounded-full mb-10"
            style={{
              background: 'rgba(98,212,174,0.07)',
              border: '1px solid rgba(98,212,174,0.18)',
              animationDelay: '0.1s',
            }}
          >
            <span className="w-[5px] h-[5px] rounded-full bg-[#62D4AE] gpulse" style={{ boxShadow: '0 0 6px #62D4AE' }} />
            Content Unavailable
          </div>

          {/* ── Glitching Logo Object ── */}
          <div 
            className="fu relative w-[140px] h-[140px] mb-11 premium-pulse backdrop-blur-xl ring-1 ring-white/5 rounded-[28px]" 
            style={{ animationDelay: '0.2s' }}
          >
            {/* Outer glow */}
            <div className="glow-outer absolute inset-[-25px] rounded-[36px] bg-[radial-gradient(circle,rgba(98,212,174,0.12)_0%,transparent_70%)] pointer-events-none" />
            {/* Inner glow */}
            <div className="glow-inner absolute inset-2 rounded-[24px] bg-[radial-gradient(circle,rgba(98,212,174,0.08)_0%,transparent_60%)] pointer-events-none" />

            {/* Base emblem */}
            <img
              src="/Logo.png"
              alt="Rigzer Emblem"
              className="relative z-10 w-full h-full object-cover rounded-[28px] border border-white/5"
            />

            {/* Fragment overlay A — whole-image displacement */}
            <div className="frag-a absolute inset-0 z-[11] rounded-[28px] overflow-hidden pointer-events-none">
              <img
                src="/Logo.png"
                alt=""
                aria-hidden
                className="w-full h-full object-cover rounded-[28px]"
                style={{ filter: 'hue-rotate(90deg) saturate(1.4)' }}
              />
            </div>

            {/* Fragment overlay B — clipped horizontal slice */}
            <div
              className="frag-b absolute inset-0 z-[12] rounded-[28px] overflow-hidden pointer-events-none"
              style={{ clipPath: 'inset(30% 0 40% 0)' }}
            >
              <img
                src="/Logo.png"
                alt=""
                aria-hidden
                className="w-full h-full object-cover rounded-[28px]"
                style={{ filter: 'hue-rotate(-60deg) saturate(0.9) brightness(1.1)' }}
              />
            </div>

            {/* Scan line */}
            <div className="absolute inset-0 z-[13] rounded-[28px] overflow-hidden pointer-events-none">
              <div
                className="scan-line absolute left-0 right-0 h-[2px]"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(98,212,174,0.6), transparent)',
                }}
              />
            </div>
          </div>

          {/* Text content */}
          <div className="fu text-center max-w-[400px]" style={{ animationDelay: '0.4s' }}>
            <h2
              className="font-bold tracking-tight mb-3 text-transparent bg-clip-text"
              style={{
                fontSize: 'clamp(26px,4vw,36px)',
                lineHeight: 1.1,
                backgroundImage: 'linear-gradient(160deg, #ffffff 0%, rgba(255,255,255,0.55) 100%)',
              }}
            >
              Content Not Found
            </h2>
            <p className="text-[14px] leading-[1.7] mb-9" style={{ color: 'rgba(255,255,255,0.5)' }}>
              This post, game, or article is no longer available.<br/>It may have been removed or the link has changed.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">

              {/* Secondary — Ghost */}
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 text-[13px] font-medium tracking-[0.02em] px-5 py-2.5 rounded-lg transition-all duration-200 active:scale-95 w-full sm:w-auto justify-center"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.13)',
                  color: 'rgba(255,255,255,0.5)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.26)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.82)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.13)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Go Back
              </button>

              {/* Primary — Emerald glass */}
              <button
                onClick={() => (window.location.href = '/')}
                className="relative overflow-hidden inline-flex items-center gap-2 text-[13px] font-medium tracking-[0.02em] px-5 py-2.5 rounded-lg transition-all duration-200 active:scale-95 w-full sm:w-auto justify-center group"
                style={{
                  background: 'rgba(98,212,174,0.09)',
                  border: '1px solid rgba(98,212,174,0.38)',
                  color: '#62D4AE',
                }}
                onMouseEnter={e => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = 'rgba(98,212,174,0.16)';
                  b.style.borderColor = 'rgba(98,212,174,0.65)';
                  b.style.color = '#8de8ca';
                  b.style.transform = 'translateY(-1px)';
                  b.style.boxShadow = '0 0 22px rgba(98,212,174,0.16), inset 0 0 10px rgba(98,212,174,0.05)';
                }}
                onMouseLeave={e => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = 'rgba(98,212,174,0.09)';
                  b.style.borderColor = 'rgba(98,212,174,0.38)';
                  b.style.color = '#62D4AE';
                  b.style.transform = 'translateY(0)';
                  b.style.boxShadow = 'none';
                }}
              >
                {/* Inner highlight */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"
                  style={{ background: 'linear-gradient(135deg, rgba(98,212,174,0.1) 0%, transparent 60%)' }}
                />
                <span className="relative z-10 flex items-center gap-2">
                  Explore Feed
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 3l14 9-14 9V3z" />
                  </svg>
                </span>
              </button>

            </div>
          </div>

        </div>
      </div>
    </>
  );
}