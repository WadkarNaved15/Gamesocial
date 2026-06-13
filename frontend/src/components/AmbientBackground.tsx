import { useEffect, useRef } from "react";

interface Orb {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  color: [number, number, number];
  a: number;
  phase: number;
}

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const orbs: Orb[] = [
      // Faint neutral/white base — low opacity, almost ghost-like
      { x: 0.18, y: 0.25, r: 0.70, vx: 0.000090, vy: 0.000052, color: [245, 248, 255], a: 0.035, phase: 0.0 },
      { x: 0.80, y: 0.55, r: 0.65, vx: -0.000075, vy: -0.000044, color: [245, 248, 255], a: 0.025, phase: 1.8 },
      { x: 0.50, y: 0.88, r: 0.58, vx: 0.000062, vy: -0.000068, color: [245, 248, 255], a: 0.030, phase: 3.4 },

      // Muted slate/teal — very subtle cool undertone, replacing bright colors
      { x: 0.05, y: 0.72, r: 0.52, vx: 0.000085, vy: -0.000055, color: [45, 75, 85], a: 0.040, phase: 0.8 },
      { x: 0.90, y: 0.30, r: 0.46, vx: -0.000070, vy: 0.000062, color: [45, 75, 85], a: 0.035, phase: 3.0 },

      // Deep Navy / Dark Charcoal — creates spatial depth without adding visible "color"
      { x: 0.45, y: 0.48, r: 0.60, vx: -0.000068, vy: -0.000050, color: [12, 18, 28], a: 0.060, phase: 2.2 },
      { x: 0.22, y: 0.62, r: 0.50, vx: 0.000055, vy: 0.000038, color: [12, 18, 28], a: 0.050, phase: 4.6 },
      { x: 0.75, y: 0.85, r: 0.44, vx: -0.000048, vy: -0.000040, color: [12, 18, 28], a: 0.045, phase: 1.1 },
    ];

    function resize() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx!.scale(dpr, dpr);
    }

    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!canvas || !ctx) return;
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      // Near-black base
      ctx.fillStyle = "#0a0a0d";
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "screen";

      for (const o of orbs) {
        const drift = 0.048 * Math.sin(t * 0.00050 + o.phase);
        const driftY = 0.034 * Math.cos(t * 0.00038 + o.phase + 1.4);
        
        const nx = ((o.x + o.vx * t + drift + 1.6) % 1.6) - 0.30;
        const ny = ((o.y + o.vy * t + driftY + 1.6) % 1.6) - 0.30;
        
        const cx = nx * w;
        const cy = ny * h;
        const breathe = 1 + 0.048 * Math.sin(t * 0.00025 + o.phase * 1.5);
        const radius = o.r * Math.max(w, h) * breathe;
        
        const [r, g, b] = o.color;
        const a0 = o.a;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0,    `rgba(${r},${g},${b},${a0.toFixed(4)})`);
        grad.addColorStop(0.38, `rgba(${r},${g},${b},${(a0 * 0.60).toFixed(4)})`);
        grad.addColorStop(0.72, `rgba(${r},${g},${b},${(a0 * 0.18).toFixed(4)})`);
        grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      // Vignette
      const vign = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.10, w * 0.5, h * 0.5, h * 0.92);
      vign.addColorStop(0,    "rgba(0,0,0,0)");
      vign.addColorStop(0.52, "rgba(0,0,0,0.10)");
      vign.addColorStop(1,    "rgba(0,0,0,0.80)");
      ctx.fillStyle = vign;
      ctx.fillRect(0, 0, w, h);

      // Top darkening for nav/header legibility
      const topG = ctx.createLinearGradient(0, 0, 0, h * 0.18);
      topG.addColorStop(0, "rgba(0,0,0,0.32)");
      topG.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = topG;
      ctx.fillRect(0, 0, w, h * 0.18);

      t++;
      animId = requestAnimationFrame(draw);
    }

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      // Draw once, static
      draw();
      cancelAnimationFrame(animId!);
    } else {
      draw();
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}