import React from "react";
import { Upload } from "lucide-react";
import "@google/model-viewer";
import type { AdAsset } from "../../types/Post";
import { hexToRgb, getContrastText } from "../../utils/adModelPreviewUtils";

interface AdModelPostPreviewProps {
  asset: AdAsset | null;
  description: string;
  brandName: string;
  logoImage: string;
  bgMode: "color" | "image";
  bgColor: string;
  bgImage: string | null;
  bgImagePosition: string;
  bgImageSize: string;
  overlayOpacity: number;
  ctaText: string;
  ctaColor: string;
  isExpanded: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

const AdModelPostPreview: React.FC<AdModelPostPreviewProps> = ({
  asset,
  description,
  brandName,
  logoImage,
  bgMode,
  bgColor,
  bgImage,
  bgImagePosition,
  bgImageSize,
  overlayOpacity,
  ctaText,
  ctaColor,
  isExpanded,
  setIsExpanded,
}) => {
  const isTransparent = bgMode === 'color' && bgColor === 'transparent';
  const isImage = bgMode === 'image' && !!bgImage;
  const accentRgb = !isTransparent && bgMode === 'color' ? hexToRgb(bgColor) : null;

  const glassOuterStyle: React.CSSProperties = {
    position: 'relative',
    background: bgMode === 'color' ? bgColor : 'transparent',
  };

  const glassCardStyle: React.CSSProperties = isImage
    ? {
      border: '1px solid rgba(255,255,255,0.18)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
    }
    : {
      background: `rgba(0,0,0,${overlayOpacity / 100})`,
      border: `1px solid rgba(${accentRgb},0.3)`,
      boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)`,
    };

  const glassPillStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.22)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.20)',
  };

  const glassAdBadgeStyle: React.CSSProperties = accentRgb
    ? { background: `rgba(${accentRgb},0.25)`, border: `1px solid rgba(${accentRgb},0.4)`, color: bgColor }
    : { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.7)' };

  const glassModelAreaStyle: React.CSSProperties = { background: 'transparent' };

  const transparentPillStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.06)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  };

  const CHARACTER_LIMIT = 150;
  const isLongText = description.length > CHARACTER_LIMIT;

  const displayedText = isLongText && !isExpanded
    ? `${description.slice(0, CHARACTER_LIMIT)}... `
    : description;

  return (
    <div className="px-4 pb-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Live Preview</p>

      {isTransparent ? (
        <div className="relative w-full border border-gray-200 bg-[#F9FAFB] rounded-xl overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={transparentPillStyle}>
                {logoImage ? (
                  <img src={logoImage} alt="Logo" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-black text-gray-500">
                    {(brandName || 'B').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-gray-700 text-xs font-bold tracking-wide">
                  {brandName || 'Brand Name'}
                </span>
              </div>
              <div className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-400"
                style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)' }}>Ad</div>
            </div>
            {description && (
              <p className="text-gray-800 text-sm leading-relaxed mb-2">
                <span>{displayedText}</span>
                {isLongText && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-[11px] font-bold tracking-wide uppercase ml-1 bg-gray-200/60 hover:bg-gray-200 px-2 py-0.5 rounded-md inline-block align-middle cursor-pointer text-[#3D7A6E]"
                  >
                    {isExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </p>
            )}
            <div className="relative overflow-hidden w-full h-[400px] rounded-xl bg-gray-100">
              {asset ? (
                // @ts-ignore
                <model-viewer src={asset.previewUrl} camera-controls auto-rotate exposure="1.2" environment-image="neutral" shadow-intensity="1"
                  style={{ width: '100%', height: '400px', backgroundColor: 'transparent' }} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-30">
                  <Upload size={28} className="text-gray-400" />
                  <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">3D Model</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden rounded-2xl flex flex-col" style={glassOuterStyle}>
          {isImage && (
            <>
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: `url(${bgImage})`,
                backgroundSize: bgImageSize,
                backgroundPosition: bgImagePosition,
                backgroundRepeat: 'no-repeat',
                filter: 'blur(28px)',
                transform: 'scale(1.12)',
                opacity: 0.55,
              }} />
              <div className="absolute inset-0 pointer-events-none" style={{ background: `rgba(0,0,0,${overlayOpacity / 100 * 0.3})` }} />
            </>
          )}

          {/* Clean Unified Card Area Container */}
          <div className="relative z-10 rounded-2xl overflow-hidden w-full h-[600px] flex flex-col bg-neutral-900/40" style={glassCardStyle}>
            {isImage && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${bgImage})`,
                  backgroundSize: bgImageSize,
                  backgroundPosition: bgImagePosition,
                  backgroundRepeat: 'no-repeat',
                }}
              />
            )}

            {isImage && (
              <div className="absolute inset-0 pointer-events-none" style={{
                background: `rgba(0,0,0,${overlayOpacity / 100})`,
              }} />
            )}

            {/* Top Branding Strip */}
            <div className="relative z-10 w-full flex items-center justify-between px-4 pt-4 pb-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={glassPillStyle}>
                <img src={logoImage || "/default_avatar.png"} className="w-10 h-10 rounded-full object-cover" />
                <span className="text-white text-xs font-bold tracking-wide drop-shadow-sm">{brandName || 'Brand Name'}</span>
              </div>
              <div className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest" style={glassAdBadgeStyle}>Ad</div>
            </div>

            {/* Fixed Canvas Size Content Layer */}
            <div className="absolute inset-0 z-0 w-full h-full overflow-hidden" style={glassModelAreaStyle}>
              {accentRgb && (
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse 60% 50% at 50% 60%, rgba(${accentRgb},0.2) 0%, transparent 70%)` }} />
              )}
              {asset ? (
                // @ts-ignore
                <model-viewer src={asset.previewUrl} camera-controls auto-rotate exposure="1.15" environment-image="neutral" shadow-intensity="0.8"
                  style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-25">
                  <Upload size={28} className="text-white" />
                  <span className="text-white text-[10px] font-bold uppercase tracking-widest">3D Model</span>
                </div>
              )}
            </div>

            {/* FLOATING GLASS DESCRIPTION STRIP (Matches the top pill style) */}
            {(description || ctaText) && (
              <div
                className="absolute bottom-0 left-0 right-0 w-full z-20 px-4 py-4 text-sm leading-relaxed tracking-wide text-gray-100 border-t border-white/20 rounded-b-2xl shadow-xl"
                style={{
                  // Lowered from 0.12 to 0.03 for deep transparency, or use 'transparent'
                  background: 'rgba(255, 255, 255, 0.03)',
                  // Reduced or removed blur so details behind it are sharp and visible
                  backdropFilter: 'blur(2px)',
                  WebkitBackdropFilter: 'blur(2px)',
                }}
              >
                <div className="flex items-center justify-between gap-4 relative z-10">
                  <div className="flex-1">
                    {description ? (
                      <>
                        <span style={{ fontSize: "101%", fontWeight: 600 }} className="drop-shadow-md">
                          {displayedText}
                        </span>
                        {isLongText && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsExpanded(!isExpanded);
                            }}
                            className="text-[10px] font-bold tracking-wide uppercase ml-2 bg-white/15 hover:bg-white/30 px-2 py-0.5 rounded-md inline-block align-middle cursor-pointer transition text-white border border-white/10"
                          >
                            {isExpanded ? "Less" : "More"}
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="italic text-gray-400">Draft your ad copy layout here...</span>
                    )}
                  </div>

                  {ctaText && (
                    <button
                      className="
                        flex-shrink-0
                        px-4
                        py-2
                        rounded-xl
                        text-[10px]
                        font-black
                        uppercase
                        tracking-widest
                        transition
                        hover:scale-[1.02]
                        active:scale-[0.98]
                        shadow-md
                        whitespace-nowrap
                      "
                      style={{
                        backgroundColor: ctaColor,
                        color: getContrastText(ctaColor),
                      }}
                    >
                      {ctaText}
                      <span className="ml-1 opacity-70">→</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdModelPostPreview;