import React, { useState, useRef } from "react";
import { Sparkles } from "lucide-react";

type MediaAsset = {
  type: "image" | "video";
  url: string;
  name?: string;
};

type Props = {
  brandName: string;
  brandLogo?: string | null;
  description?: string;
  ctaText?: string;
  ctaLink?: string;
  asset?: MediaAsset | null;

  accentColor: string;
  useGlowEffect: boolean;
  cardLayoutTheme: "glass" | "gradient" | "minimal";

  rgbAccent: string;
  interactiveTilt?: boolean;
};

const PRESET_ACCENTS = [
  { hex: "#18181b", text: "#ffffff" },
  { hex: "#6366f1", text: "#ffffff" },
  { hex: "#8b5cf6", text: "#ffffff" },
  { hex: "#10b981", text: "#ffffff" },
  { hex: "#ef4444", text: "#ffffff" },
  { hex: "#f59e0b", text: "#000000" },
];

const MediaAdPostCard: React.FC<Props> = ({
  brandName,
  brandLogo,
  description = "",
  ctaText,
  asset,
  accentColor,
  useGlowEffect,
  cardLayoutTheme,
  rgbAccent,
  interactiveTilt = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  // Track hover state to cleanly handle transition swapping
  const [isHovered, setIsHovered] = useState(false);

  const CHARACTER_LIMIT = 120;
  const isLongText = description.length > CHARACTER_LIMIT;

  const displayedText = isLongText && !isExpanded
    ? `${description.slice(0, CHARACTER_LIMIT)}... `
    : description;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactiveTilt || !cardRef.current) return;

    // We calculate coordinates relative to the stable bounding box container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xc = rect.width / 2;
    const yc = rect.height / 2;

    // Smoothly limits the maximum tilt rotation angle
    const rotateX = (yc - y) / 55;
    const rotateY = (x - xc) / 55;

    setIsHovered(true);
    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const resetTilt = () => {
    if (!cardRef.current) return;
    setIsHovered(false);
    cardRef.current.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
  };

  const baseGlow = useGlowEffect
    ? `0 10px 25px rgba(${rgbAccent}, 0.17)`
    : "0 6px 20px rgba(0, 0, 0, 0.3)";

  const getDynamicCardStyles = (): React.CSSProperties => {
    if (cardLayoutTheme === "glass") {
      return {
        background: `linear-gradient(135deg, rgba(24, 24, 27, 0.92) 0%, rgba(15, 15, 18, 0.96) 100%)`,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: `1px solid rgba(${rgbAccent}, 0.28)`,
        boxShadow: `${baseGlow}, inset 0 1px 1px rgba(255, 255, 255, 0.1)`,
      };
    }
    if (cardLayoutTheme === "gradient") {
      return {
        background: `linear-gradient(145deg, rgba(${rgbAccent}, 0.15) 0%, rgba(10, 10, 12, 0.98) 60%)`,
        border: `1px solid rgba(${rgbAccent}, 0.4)`,
        boxShadow: `${baseGlow}, inset 0 1px 2px rgba(${rgbAccent}, 0.2)`,
      };
    }
    return {
      background: "#09090b",
      border: `1px solid rgba(255, 255, 255, 0.08)`,
      boxShadow: baseGlow,
    };
  };

  const buttonTextColor = PRESET_ACCENTS.find(p => p.hex === accentColor)?.text || "#ffffff";

  return (
    /* 
      1. STABLE BOUNDING BOX WRAPPER
      This container handles mouse listeners, stays perfectly flat, and prevents 
      edge-calculated stutter loops.
    */
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      className="w-full max-w-full relative block select-none"
      style={{ perspective: "1000px" }}
    >
      {/* 
        2. VISUAL TILT LAYER 
        This internal div handles only the visual transformations.
        Notice we conditionally add the transition: instantaneous tracking on move,
        smooth 300ms glide snap back when moving away.
      */}
      <div
        ref={cardRef}
        className="w-full h-full rounded-2xl overflow-hidden p-0.5 group"
        style={{
          ...getDynamicCardStyles(),
          transformStyle: "preserve-3d",
          transition: isHovered
            ? "transform 0.1s ease-out, box-shadow 0.3s ease"
            : "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.3s ease",
        }}
      >
        {/* ADVANCED HEAD BANNER */}
        <div className="flex justify-between items-center px-4 pt-4 pb-3" style={{ transform: "translateZ(20px)" }}>
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 shadow-sm">
            <img src={brandLogo || "/default_avatar.png"} className="w-8 h-8 rounded-full object-cover" alt="Brand Identity" />
            <span className="text-white text-xs font-bold tracking-wide drop-shadow-sm">
              {brandName || "Brand Identity"}
            </span>
          </div>

          {/* HIGH ACCENT GLOW BADGE */}
          <span
            className="text-[9px] font-black uppercase tracking-widest px-3 py-1 text-white border rounded-full transition-colors"
            style={{
              backgroundColor: `rgba(${rgbAccent}, 0.25)`,
              borderColor: accentColor,
              boxShadow: `0 0 12px rgba(${rgbAccent}, 0.4)`,
            }}
          >
            ✦ Sponsored ✦
          </span>
        </div>

        {/* VISUAL PAYLOAD BLOCK */}
        <div className="h-[400px] bg-zinc-950 flex items-center justify-center relative overflow-hidden border-y border-white/5">
          {asset ? (
            asset.type === "video" ? (
              <video src={asset.url} autoPlay muted loop className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700" />
            ) : (
              <img src={asset.url} alt="Creative Payload" className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700" />
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-30 bg-gradient-to-tr from-zinc-900 to-zinc-950">
              <Sparkles size={32} style={{ color: accentColor }} className="animate-spin [animation-duration:8s]" />
              <span className="text-white text-[10px] font-bold uppercase tracking-widest">Aura Medium Canvas Preview</span>
            </div>
          )}

          {/* PREMIUM OVERLAY SHADOW GRADIENT TO STAND OUT */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
        </div>

        {/* FLOATING TEXT & CTA CONTAINER */}
        <div
          className="p-4 text-sm leading-relaxed font-light text-zinc-100 tracking-wide drop-shadow-sm break-words"
          style={{ transform: "translateZ(25px)" }}
        >
          {/* The Button floats right inside the block container */}
          {ctaText && (
            <button
              className="float-right ml-4 mb-1.5 px-8 py-2.5 -translate-y-[6px] transition rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl transform active:scale-[0.99] hover:brightness-110 flex items-center justify-center gap-1.5 whitespace-nowrap select-none"
              style={{
                backgroundColor: accentColor,
                boxShadow: useGlowEffect ? `0 6px 15px rgba(${rgbAccent}, 0.3)` : "none",
                color: buttonTextColor,
              }}
            >
              <span>{ctaText}</span>
              <span className="opacity-60 text-xs">→</span>
            </button>
          )}

          {/* Text rendering with inline toggle link */}
          {description ? (
            <>
              <span>{displayedText}</span>
              {isLongText && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-[11px] font-bold tracking-wide uppercase transition-all duration-150 ml-1 bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-md inline-block align-middle cursor-pointer"
                  style={{ color: accentColor }}
                >
                  {isExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </>
          ) : (
            <span className="italic text-zinc-600">
              Draft your ad copy layout here...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaAdPostCard;