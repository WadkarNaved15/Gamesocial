import React, { useEffect, useRef } from 'react';

export default function ProfileNotFound() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W: number, H: number;
    let particles: Array<{
      x: number; y: number; r: number; opacity: number;
      vx: number; vy: number; flicker: number; flickerSpeed: number;
    }> = [];
    let driftT = 0;
    let animationFrameId: number;

    const resize = () => {
      // Use parent container dimensions instead of window to stay contained
      W = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      H = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    const initParticles = () => {
      particles = [];
      const count = Math.min(55, Math.floor((W * H) / 22000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.2 + 0.3,
          opacity: Math.random() * 0.25 + 0.04,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.1,
          flicker: Math.random() * Math.PI * 2,
          flickerSpeed: 0.01 + Math.random() * 0.02,
        });
      }
    };

    const drawBg = () => {
      ctx.clearRect(0, 0, W, H);
      const offsetX = Math.sin(driftT * 0.0008) * 60;
      const offsetY = Math.cos(driftT * 0.0006) * 40;

      // Primary center glow
      let g = ctx.createRadialGradient(
        W * 0.5 + offsetX, H * 0.42 + offsetY, 0,
        W * 0.5 + offsetX, H * 0.42 + offsetY, Math.max(W, H) * 0.55
      );
      g.addColorStop(0, 'rgba(36,73,62,0.22)');
      g.addColorStop(0.5, 'rgba(20,45,40,0.08)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Corner accent — bottom right
      let g2 = ctx.createRadialGradient(W, H, 0, W, H, W * 0.55);
      g2.addColorStop(0, 'rgba(98,212,174,0.05)');
      g2.addColorStop(0.4, 'rgba(36,73,62,0.04)');
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);

      // Corner accent — top left
      let g3 = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.45);
      g3.addColorStop(0, 'rgba(36,73,62,0.1)');
      g3.addColorStop(1, 'transparent');
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, W, H);
    };

    const drawParticles = () => {
      particles.forEach((p) => {
        p.flicker += p.flickerSpeed;
        const alpha = p.opacity * (0.7 + 0.3 * Math.sin(p.flicker));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(98,212,174,${alpha.toFixed(3)})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -5) p.x = W + 5;
        if (p.x > W + 5) p.x = -5;
        if (p.y < -5) p.y = H + 5;
        if (p.y > H + 5) p.y = -5;
      });
    };

    const frame = () => {
      driftT++;
      drawBg();
      drawParticles();
      animationFrameId = requestAnimationFrame(frame);
    };

    window.addEventListener('resize', () => {
      resize();
      initParticles();
    });

    resize();
    initParticles();
    frame();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up { animation: fadeUp 0.9s ease forwards; opacity: 0; }
      `}</style>

      {/* Replaced h-screen with min-h-[calc(100vh-120px)] */}
      <div className="relative w-full min-h-[calc(100vh-120px)] bg-[#050505] text-white overflow-hidden font-sans rounded-2xl">
        
        {/* Canvas & Overlay Layers - Changed from fixed to absolute so they stay inside the container */}
        <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />
        <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.028] bg-[url('data:image/svg+xml,%3Csvg viewBox=\\'0 0 256 256\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cfilter id=\\'n\\'%3E%3CfeTurbulence type=\\'fractalNoise\\' baseFrequency=\\'0.9\\' numOctaves=\\'4\\' stitchTiles=\\'stitch\\'/%3E%3C/filter%3E%3Crect width=\\'100%25\\' height=\\'100%25\\' filter=\\'url(%23n)\\'/%3E%3C/svg%3E')] bg-[length:128px_128px]" />
        <div className="absolute inset-0 z-[2] pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_40%,rgba(0,0,0,0.72)_100%)]" />

        {/* Main Content Layout */}
        <main className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 min-h-[calc(100vh-120px)]">
          
          {/* Status Tag */}
          <div className="inline-flex items-center gap-[7px] text-[11px] font-medium tracking-[0.14em] uppercase text-[#4FA98B] bg-[#62D4AE]/10 border border-[#62D4AE]/20 px-3.5 py-1.5 rounded-full mb-10 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <span className="w-[5px] h-[5px] rounded-full bg-[#62D4AE] shadow-[0_0_6px_#62D4AE] animate-pulse" />
            Profile Unavailable
          </div>

          {/* Logo Section */}
          <div className="relative w-40 h-40 mb-11 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <div className="absolute inset-[-30px] rounded-[40px] bg-[radial-gradient(circle,rgba(98,212,174,0.15)_0%,transparent_70%)] animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute inset-2 rounded-[30px] bg-[radial-gradient(circle,rgba(98,212,174,0.1)_0%,transparent_60%)]" />

            <img 
              src="/Logo.png" 
              alt="Rigzer Emblem" 
              className="relative z-10 w-full h-full object-cover rounded-[32px] shadow-[0_0_20px_rgba(98,212,174,0.2)] border border-white/5" 
            />
          </div>

          {/* Text Content */}
          <div className="text-center max-w-[520px] animate-fade-up" style={{ animationDelay: '0.5s' }}>
            <h1 className="text-[clamp(32px,5vw,48px)] font-bold tracking-[-0.025em] leading-[1.1] mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
              Profile Not Found
            </h1>
            <p className="text-[15px] font-normal leading-[1.65] text-white/55 mb-10 max-w-[400px] mx-auto">
              The profile you're looking for doesn't exist, may have been renamed, or is no longer available.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button 
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 text-[13.5px] font-medium tracking-[0.02em] px-6 py-2.5 rounded-lg bg-transparent border border-white/15 text-white/55 hover:bg-white/5 hover:border-white/30 hover:text-white/85 transition-all duration-200 active:scale-95 w-full sm:w-auto justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Go Back
              </button>

              <button 
                onClick={() => window.location.href = '/'}
                className="relative overflow-hidden inline-flex items-center gap-2 text-[13.5px] font-medium tracking-[0.02em] px-6 py-2.5 rounded-lg bg-[#62D4AE]/10 border border-[#62D4AE]/40 text-[#62D4AE] hover:bg-[#62D4AE]/20 hover:border-[#62D4AE]/70 hover:text-[#8de8ca] hover:shadow-[0_0_22px_rgba(98,212,174,0.18),inset_0_0_12px_rgba(98,212,174,0.06)] hover:-translate-y-[1px] transition-all duration-200 active:scale-95 w-full sm:w-auto justify-center group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#62D4AE]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <span className="relative z-10 flex items-center gap-2">
                  Discover Creators
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}