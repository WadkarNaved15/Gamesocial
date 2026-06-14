import React, { useEffect, useRef } from 'react';
import Logo from "../../assets/Icon.svg?react";

// ─────────────────────────────────────────────────────────────
// CATEGORY B — GLOBAL ERROR PAGE
// Replaces the entire application. Full-screen. No shell.
// ─────────────────────────────────────────────────────────────

interface PageNotFoundProps {
  /** Pass window.location.pathname or your router's current path */
  path?: string;
}

export default function PageNotFound({ path }: PageNotFoundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentPath = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/unknown');

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

      // Primary glow — center
      const g1 = ctx.createRadialGradient(W * 0.5 + ox, H * 0.46 + oy, 0, W * 0.5 + ox, H * 0.46 + oy, Math.max(W, H) * 0.6);
      g1.addColorStop(0, 'rgba(36,73,62,0.28)');
      g1.addColorStop(0.5, 'rgba(20,45,40,0.1)');
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

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pathBlink {
          0%, 100% { opacity: 0.35; }
          50%       { opacity: 0.18; }
        }
        .animate-fade-up { animation: fadeUp 0.9s ease forwards; opacity: 0; }
        .path-blink { animation: pathBlink 3s ease-in-out infinite; }
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
        <div className="absolute inset-0 z-[2] pointer-events-none bg-[radial-gradient(ellipse_90%_90%_at_50%_50%,transparent_30%,rgba(0,0,0,0.78)_100%)]" />

        {/* ── Top Header Logo ── */}
        <div
          className="fixed top-8 left-10 flex items-center gap-3 z-[99999] animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          <Logo
            className="w-7 h-7"
            style={{
              color: "#62D4AE",
            }}
          />

          <span className="text-sm font-semibold tracking-[0.12em] uppercase text-white/70">
            Rigzer
          </span>
        </div>

        {/* Main content — centered */}
        <main className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8">

          {/* Status pill (Moved above logo) */}
          <div className="animate-fade-up inline-flex items-center gap-[7px] text-[10.5px] font-semibold tracking-[0.16em] uppercase text-[#4FA98B] bg-[#62D4AE]/10 border border-[#62D4AE]/20 px-3.5 py-1.5 rounded-full mb-[22px]" style={{ animationDelay: '0.15s' }}>
            <span className="w-[5px] h-[5px] rounded-full bg-[#62D4AE] shadow-[0_0_6px_#62D4AE] animate-pulse" style={{ animationDuration: '4s' }} />
            Page Not Found
          </div>

          {/* ── Image & Glow Setup ── */}
          <div className="relative w-[160px] h-[160px] mb-14 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            {/* Background Glows for the Logo */}
            <div className="absolute inset-[-30px] rounded-[40px] bg-[radial-gradient(circle,rgba(98,212,174,0.15)_0%,transparent_70%)] animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute inset-2 rounded-[30px] bg-[radial-gradient(circle,rgba(98,212,174,0.1)_0%,transparent_60%)]" />
            
            <img 
              src="/Logo.png" 
              alt="Rigzer Emblem" 
              className="relative z-10 w-full h-full object-cover rounded-[32px] shadow-[0_0_20px_rgba(98,212,174,0.2)] border border-white/5" 
            />
          </div>

          {/* ── Text Content ── */}

          {/* Heading */}
          <h1 className="animate-fade-up text-[clamp(34px,5.5vw,56px)] pb-3 font-bold tracking-[-0.025em] leading-[1.08] mb-4 text-center text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50" style={{ animationDelay: '0.45s' }}>
            Page Not Found
          </h1>

          {/* Description */}
          <p className="animate-fade-up text-[15px] leading-[1.65] text-white/50 text-center max-w-[380px] mb-2.5" style={{ animationDelay: '0.5s' }}>
            The page you're trying to reach doesn't exist or has moved.
          </p>

          {/* Route display */}
          <p className="animate-fade-up path-blink font-mono text-[12px] text-white/20 tracking-[0.04em] text-center mb-10" style={{ animationDelay: '0.6s' }}>
            {currentPath}
          </p>

          {/* Actions */}
          <div className="animate-fade-up flex flex-row gap-3 flex-wrap justify-center items-center" style={{ animationDelay: '0.72s' }}>
            <GhostButton onClick={() => window.history.back()}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Go Back
            </GhostButton>

            <EmeraldButton onClick={() => (window.location.href = '/')}>
              Return Home
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </EmeraldButton>
          </div>

        </main>

        {/* ── Footer ── */}
        <div className="fixed bottom-8 inset-x-0 flex justify-center pointer-events-none z-20">
          <p className="text-[11px] tracking-[0.1em] uppercase text-white/25 whitespace-nowrap animate-fade-up" style={{ animationDelay: '0.9s' }}>
            Rigzer &nbsp;&mdash;&nbsp; Game Streaming Platform
          </p>
        </div>

      </div>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────

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

function EmeraldButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden inline-flex items-center gap-2 text-[13.5px] font-medium tracking-[0.02em] px-[22px] py-[10px] rounded-[10px] cursor-pointer bg-[#62D4AE]/10 border border-[#62D4AE]/40 text-[#62D4AE] transition-all duration-200 outline-none hover:bg-[#62D4AE]/20 hover:border-[#62D4AE]/70 hover:text-[#8de8ca] hover:-translate-y-[1px] hover:shadow-[0_0_24px_rgba(98,212,174,0.18),inset_0_0_12px_rgba(98,212,174,0.05)] active:scale-95 active:translate-y-0 group"
    >
      {/* Inner subtle highlight effect on hover */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-[10px] bg-gradient-to-br from-[#62D4AE]/10 to-transparent" />
      
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </button>
  );
}