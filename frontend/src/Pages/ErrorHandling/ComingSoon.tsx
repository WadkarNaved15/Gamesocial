import React, { useEffect, useRef, useState } from 'react';
import Logo from "../../assets/Icon.svg?react";

// ─────────────────────────────────────────────────────────────
// CATEGORY B — GLOBAL COMING SOON PAGE
// Replaces the entire application. Full-screen. No shell.
// ─────────────────────────────────────────────────────────────

interface ComingSoonProps {
  /** ISO date string or Date the feature/site launches */
  launchDate?: string | Date;
  /** Optional override for the heading */
  title?: string;
  /** Optional override for the description copy */
  description?: string;
}

export default function ComingSoon({
  launchDate,
  title = "Mobile & Tablet Support Coming Soon",
  description =  "Rigzer is currently optimized for desktop browsers. We're working on a mobile-friendly version. For the best experience, please visit Rigzer from a desktop or laptop browser.",
}: ComingSoonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  // ── Countdown ──
//   useEffect(() => {
//     if (!launchDate) return;
//     const target = new Date(launchDate).getTime();

//     const tick = () => {
//       const diff = target - Date.now();
//       if (diff <= 0) {
//         setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
//         return;
//       }
//       setTimeLeft({
//         d: Math.floor(diff / (1000 * 60 * 60 * 24)),
//         h: Math.floor((diff / (1000 * 60 * 60)) % 24),
//         m: Math.floor((diff / (1000 * 60)) % 60),
//         s: Math.floor((diff / 1000) % 60),
//       });
//     };

//     tick();
//     const id = setInterval(tick, 1000);
//     return () => clearInterval(id);
//   }, [launchDate]);

  // ── Ambient particle canvas (matches PageNotFound) ──
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

      const g1 = ctx.createRadialGradient(W * 0.5 + ox, H * 0.46 + oy, 0, W * 0.5 + ox, H * 0.46 + oy, Math.max(W, H) * 0.6);
      g1.addColorStop(0, 'rgba(36,73,62,0.28)');
      g1.addColorStop(0.5, 'rgba(20,45,40,0.1)');
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

      const g2 = ctx.createRadialGradient(W, H, 0, W, H, W * 0.6);
      g2.addColorStop(0, 'rgba(98,212,174,0.04)');
      g2.addColorStop(0.5, 'rgba(36,73,62,0.03)');
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

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
        .animate-fade-up { animation: fadeUp 0.9s ease forwards; opacity: 0; }
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
          <Logo className="w-7 h-7" style={{ color: "#62D4AE" }} />
          <span className="text-sm font-semibold tracking-[0.12em] uppercase text-white/70">
            Rigzer
          </span>
        </div>

        {/* Main content — centered */}
        <main className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8">

          {/* Emblem + glow */}
          <div className="relative w-[160px] h-[160px] mb-12 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <div className="absolute inset-[-30px] rounded-[40px] bg-[radial-gradient(circle,rgba(98,212,174,0.15)_0%,transparent_70%)] animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute inset-2 rounded-[30px] bg-[radial-gradient(circle,rgba(98,212,174,0.1)_0%,transparent_60%)]" />
            <img
              src="/Logo.png"
              alt="Rigzer Emblem"
              className="relative z-10 w-full h-full object-cover rounded-[32px] shadow-[0_0_20px_rgba(98,212,174,0.2)] border border-white/5"
            />
          </div>

          {/* Eyebrow */}
          {/* <div
            className="animate-fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#62D4AE]/10 border border-[#62D4AE]/25 mb-6"
            style={{ animationDelay: '0.4s' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#62D4AE] animate-pulse" />
            <span className="text-[11px] font-medium tracking-[0.14em] uppercase text-[#62D4AE]">
              Desktop Experience Available
            </span>
          </div> */}

          {/* Heading */}
          <h1
            className="animate-fade-up text-[clamp(34px,5.5vw,56px)] pb-3 font-bold tracking-[-0.025em] leading-[1.08] mb-4 text-center text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50"
            style={{ animationDelay: '0.5s' }}
          >
            {title}
          </h1>

          {/* Description */}
          <p
            className="animate-fade-up text-[15px] leading-[1.65] text-white/50 text-center max-w-[420px] mb-10"
            style={{ animationDelay: '0.58s' }}
          >
            {description}
          </p>

          {/* Countdown */}
          {/* {timeLeft && (
            <div className="animate-fade-up flex items-center gap-3 mb-10" style={{ animationDelay: '0.66s' }}>
              {[
                { label: 'Days', value: timeLeft.d },
                { label: 'Hours', value: timeLeft.h },
                { label: 'Mins', value: timeLeft.m },
                { label: 'Secs', value: timeLeft.s },
              ].map((unit, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-[64px] h-[64px] rounded-[14px] bg-white/[0.04] border border-white/[0.08] backdrop-blur-[16px] flex items-center justify-center">
                    <span className="text-[22px] font-bold tabular-nums text-white/90">
                      {String(unit.value).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="mt-2 text-[10px] tracking-[0.1em] uppercase text-white/35">
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>
          )} */}

        </main>

      </div>
    </>
  );
}