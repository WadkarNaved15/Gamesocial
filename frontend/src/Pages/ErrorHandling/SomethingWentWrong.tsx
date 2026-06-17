import React, { useEffect, useRef } from 'react';
import Logo from "../../assets/Icon.svg?react";

// ─────────────────────────────────────────────────────────────
// CATEGORY B — GLOBAL ERROR PAGE
// Replaces the entire application. Full-screen. No shell.
// ─────────────────────────────────────────────────────────────

interface SomethingWentWrongProps {
  /** Optional: called when the user clicks Retry */
  onRetry?: () => void;
}

export default function SomethingWentWrong({ onRetry }: SomethingWentWrongProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0, driftT = 0, animId: number;
    let particles: Array<{
      x: number; y: number; r: number; opacity: number;
      vx: number; vy: number; flicker: number; flickerSpeed: number;
    }> = [];

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };

    const initParticles = () => {
      particles = [];
      const count = Math.min(60, Math.floor((W * H) / 18000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.3 + 0.2,
          opacity: Math.random() * 0.22 + 0.03,
          vx: (Math.random() - 0.5) * 0.1,
          vy: (Math.random() - 0.5) * 0.08,
          flicker: Math.random() * Math.PI * 2,
          flickerSpeed: 0.007 + Math.random() * 0.018,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const ox = Math.sin(driftT * 0.0006) * 70;
      const oy = Math.cos(driftT * 0.0005) * 45;

      // Primary glow — emerald center
      const g1 = ctx.createRadialGradient(W * 0.5 + ox, H * 0.46 + oy, 0, W * 0.5 + ox, H * 0.46 + oy, Math.max(W, H) * 0.6);
      g1.addColorStop(0, 'rgba(36,73,62,0.28)');
      g1.addColorStop(0.5, 'rgba(20,45,40,0.10)');
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

      // Secondary accent — bottom right
      const g2 = ctx.createRadialGradient(W, H, 0, W, H, W * 0.6);
      g2.addColorStop(0, 'rgba(98,212,174,0.04)');
      g2.addColorStop(0.5, 'rgba(36,73,62,0.03)');
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

      // Top-left whisper
      const g3 = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.4);
      g3.addColorStop(0, 'rgba(36,73,62,0.12)');
      g3.addColorStop(1, 'transparent');
      ctx.fillStyle = g3; ctx.fillRect(0, 0, W, H);

      particles.forEach(p => {
        p.flicker += p.flickerSpeed;
        const a = p.opacity * (0.6 + 0.4 * Math.sin(p.flicker));
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

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  // Stable error reference — generated once on mount
  const errorRef = useRef(`ERR-${Date.now().toString(36).toUpperCase()}`);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes statusDot {
          0%, 100% { box-shadow: 0 0 6px #62D4AE; }
          50%       { box-shadow: 0 0 12px #62D4AE, 0 0 20px rgba(98,212,174,0.3); }
        }
        @keyframes glowBreathOuter {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.55; }
        }
        @keyframes glowBreathInner {
          0%, 100% { opacity: 0.15; }
          50%       { opacity: 0.07; }
        }
        @keyframes premiumPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(98,212,174,0.08); }
          50%       { box-shadow: 0 0 80px rgba(98,212,174,0.18); }
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
          3%   { opacity: 0.45; }
          96%  { opacity: 0.25; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes headingGlow {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
        .sww-fade-up      { animation: fadeUp 0.9s ease forwards; opacity: 0; }
        .sww-status-dot   { animation: statusDot 3s ease-in-out infinite; }
        .sww-glow-outer   { animation: glowBreathOuter 4s ease-in-out infinite; }
        .sww-glow-inner   { animation: glowBreathInner 4s ease-in-out infinite; }
        .sww-premium-pulse { animation: premiumPulse 8s ease-in-out infinite; }
        .sww-frag-a       { animation: fragmentA 7s ease-in-out infinite; animation-delay: 1.4s; }
        .sww-frag-b       { animation: fragmentB 7s ease-in-out infinite; animation-delay: 1.6s; }
        .sww-scan-line    { animation: scanLineLoop 5s linear infinite; animation-delay: 2s; }
        .sww-heading-glow { animation: headingGlow 6s ease-in-out infinite; }
      `}</style>

      {/* Root — full-screen, no shell */}
      <div className="fixed inset-0 bg-[#050505] text-white overflow-hidden font-sans z-[9999]">

        {/* Ambient canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none" />

        {/* Noise overlay */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }}
        />

        {/* Vignette */}
        <div className="absolute inset-0 z-[2] pointer-events-none bg-[radial-gradient(ellipse_90%_90%_at_50%_50%,transparent_30%,rgba(0,0,0,0.82)_100%)]" />

        {/* ── Top Header Logo ── */}
        <div
          className="fixed top-8 left-10 flex items-center gap-3 z-[99999] sww-fade-up"
          style={{ animationDelay: '0.1s' }}
        >
          <Logo className="w-7 h-7" style={{ color: '#62D4AE' }} />
          <span className="text-sm font-semibold tracking-[0.12em] uppercase text-white/70">
            Rigzer
          </span>
        </div>

        {/* Main content — centered */}
        <main className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8">

          {/* ── Emblem with instability ── */}
          <div
            className="relative w-[180px] h-[180px] mb-14 sww-fade-up"
            style={{ animationDelay: '0.3s' }}
          >
            {/* Outer breathing glow */}
            <div className="sww-glow-outer absolute inset-[-30px] rounded-[40px] bg-[radial-gradient(circle,rgba(98,212,174,0.15)_0%,transparent_70%)]" />
            {/* Inner glow */}
            <div className="sww-glow-inner absolute inset-2 rounded-[30px] bg-[radial-gradient(circle,rgba(98,212,174,0.10)_0%,transparent_60%)]" />

            {/* Base emblem — premium pulse + ring */}
            <img
              src="/Logo.png"
              alt="Rigzer Emblem"
              className="sww-premium-pulse relative z-10 w-full h-full object-cover rounded-[32px] border border-white/5 ring-1 ring-white/5 backdrop-blur-xl"
            />

            {/* Fragment overlay A — whole-image displacement */}
            <div className="sww-frag-a absolute inset-0 z-[11] rounded-[32px] overflow-hidden pointer-events-none">
              <img
                src="/Logo.png"
                alt=""
                aria-hidden
                className="w-full h-full object-cover rounded-[32px]"
                style={{ filter: 'hue-rotate(180deg) saturate(1.4)' }}
              />
            </div>

            {/* Fragment overlay B — clipped horizontal slice */}
            <div
              className="sww-frag-b absolute inset-0 z-[12] rounded-[32px] overflow-hidden pointer-events-none"
              style={{ clipPath: 'inset(30% 0 40% 0)' }}
            >
              <img
                src="/Logo.png"
                alt=""
                aria-hidden
                className="w-full h-full object-cover rounded-[32px]"
                style={{ filter: 'hue-rotate(-60deg) saturate(0.9) brightness(1.1)' }}
              />
            </div>

            {/* Scan line */}
            <div className="absolute inset-0 z-[13] rounded-[32px] overflow-hidden pointer-events-none">
              <div
                className="sww-scan-line absolute left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(98,212,174,0.5), transparent)' }}
              />
            </div>
          </div>

          {/* ── Heading glow backdrop ── */}
          <div className="relative flex flex-col items-center">
            <div
              className="sww-heading-glow absolute w-[600px] h-[280px] rounded-full -z-10"
              style={{ filter: 'blur(140px)', background: 'rgba(98,212,174,0.05)', top: '50%', transform: 'translateY(-50%)' }}
            />

            {/* Heading */}
            <h1
              className="sww-fade-up text-[clamp(40px,5vw,72px)] font-semibold tracking-[-0.015em] leading-[1.08] mb-6 pb-3 text-center text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50"
              style={{ animationDelay: '0.45s' }}
            >
              Something Went Wrong
            </h1>

            {/* Description */}
            <p
              className="sww-fade-up text-[16px] leading-[1.8] text-white/50 text-center max-w-[520px] mb-4"
              style={{ animationDelay: '0.5s' }}
            >
              An unexpected issue interrupted this experience.
              Your data is safe and the platform is still operational.
            </p>


            {/* Actions — Retry is primary */}
            <div
              className="sww-fade-up flex flex-row gap-3 flex-wrap justify-center items-center"
              style={{ animationDelay: '0.72s' }}
            >
              <EmeraldButton onClick={handleRetry}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
                </svg>
                Retry
              </EmeraldButton>

              <GhostButton onClick={() => (window.location.href = '/')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Return Home
              </GhostButton>
            </div>
          </div>

        </main>

      </div>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────

function EmeraldButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden inline-flex items-center gap-2 text-[13.5px] font-medium tracking-[0.02em] px-[22px] py-[10px] rounded-[10px] cursor-pointer bg-[#62D4AE]/10 border border-[#62D4AE]/40 text-[#62D4AE] transition-all duration-200 outline-none hover:bg-[#62D4AE]/20 hover:border-[#62D4AE]/70 hover:text-[#8de8ca] hover:-translate-y-[1px] hover:shadow-[0_0_24px_rgba(98,212,174,0.18),inset_0_0_12px_rgba(98,212,174,0.05)] active:scale-95 active:translate-y-0 group"
    >
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-[10px] bg-gradient-to-br from-[#62D4AE]/10 to-transparent" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}

function GhostButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 text-[13.5px] font-medium tracking-[0.02em] px-[22px] py-[10px] rounded-[10px] cursor-pointer bg-transparent border border-white/15 text-white/50 transition-all duration-200 outline-none hover:bg-white/5 hover:border-white/30 hover:text-white/80 active:scale-95"
    >
      {children}
    </button>
  );
}