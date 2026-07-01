// src/components/AmbientBackground.tsx
import { useEffect, useRef } from "react";

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function drawStaticBackground() {
      if (!canvas || !ctx) return;
      
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      // Handle high-DPI displays
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, w, h);

      // 1. Near-black base
      ctx.fillStyle = "#0a0a0d";
      ctx.fillRect(0, 0, w, h);

      // 2. Vignette for depth
      const vign = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.10, w * 0.5, h * 0.5, h * 0.92);
      vign.addColorStop(0,    "rgba(0,0,0,0)");
      vign.addColorStop(0.52, "rgba(0,0,0,0.10)");
      vign.addColorStop(1,    "rgba(0,0,0,0.80)");
      ctx.fillStyle = vign;
      ctx.fillRect(0, 0, w, h);

      // 3. Top darkening for nav/header legibility
      const topG = ctx.createLinearGradient(0, 0, 0, h * 0.18);
      topG.addColorStop(0, "rgba(0,0,0,0.32)");
      topG.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = topG;
      ctx.fillRect(0, 0, w, h * 0.18);
    }

    // Draw initially
    drawStaticBackground();

    // Redraw if the user resizes the window
    window.addEventListener("resize", drawStaticBackground);

    return () => {
      window.removeEventListener("resize", drawStaticBackground);
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