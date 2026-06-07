import React, { useRef } from "react";
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
  description,
  ctaText,
  asset,
  accentColor,
  useGlowEffect,
  cardLayoutTheme,
  rgbAccent,
  interactiveTilt = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactiveTilt || !ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xc = rect.width / 2;
    const yc = rect.height / 2;

    const rotateX = (yc - y) / 25;
    const rotateY = (x - xc) / 25;

    ref.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const resetTilt = () => {
    if (!ref.current) return;
    ref.current.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
  };

  const baseGlow = useGlowEffect 
    ? `0 20px 50px rgba(${rgbAccent}, 0.28)` 
    : "0 12px 40px rgba(0, 0, 0, 0.3)";

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
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      className="w-full max-w-full rounded-2xl overflow-hidden transition-all duration-150 ease-out p-0.5 group select-none"
      style={{
        ...getDynamicCardStyles(),
        transformStyle: "preserve-3d",
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

      {/* PREMIUM GLOW-ALIGNED TEXT LABELS */}
      <div className="p-4 space-y-3" style={{ transform: "translateZ(25px)" }}>
        {description ? (
          <p className="text-sm leading-relaxed font-light text-zinc-100 tracking-wide drop-shadow-sm">
            {description}
          </p>
        ) : (
          <p className="text-sm italic font-light text-zinc-600 tracking-wide">
            Draft your ad copy layout here...
          </p>
        )}

        {ctaText && (
          <button
            className="w-full py-3 transition rounded-xl text-xs font-black uppercase tracking-widest shadow-xl transform active:scale-[0.99] hover:brightness-110 flex items-center justify-center gap-1"
            style={{
              backgroundColor: accentColor,
              boxShadow: useGlowEffect ? `0 6px 20px rgba(${rgbAccent}, 0.4)` : "none",
              color: buttonTextColor,
            }}
          >
            <span>{ctaText}</span>
            <span className="opacity-50 text-sm">→</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MediaAdPostCard;