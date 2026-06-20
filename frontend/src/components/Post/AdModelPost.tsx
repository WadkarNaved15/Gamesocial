import React, { useEffect, useRef, useState } from 'react';
import '@google/model-viewer';
import type { AdModelPostProps } from '../../types/Post';

const hexToRgb = (hex: string): string | null => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}` : null;
};

const AdModelPost: React.FC<AdModelPostProps> = ({
  _id,
  user,
  description,
  adModelPost,
  onOpenDetails,
}) => {
  const postRef = useRef<HTMLElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const viewStartTime = useRef<number | null>(null);
  const [modelVisible, setModelVisible] = useState(false);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  if (!adModelPost) return null;

  const { brandName, logoUrl, bgMode, bgColor, bgImageUrl, bgImagePosition, bgImageSize, overlayOpacity = 30, asset } = adModelPost;

  const resolvedBgPos = bgImagePosition ?? '50% 50%';
  const resolvedBgSize = bgImageSize ?? 'cover';

  const modelUrl =
    asset?.optimization?.status === 'completed' && asset.optimizedUrl
      ? asset.optimizedUrl
      : asset?.originalUrl;

  const isTransparent = bgMode === 'color' && (!bgColor || bgColor === 'transparent');
  const isImage = bgMode === 'image' && !!bgImageUrl;
  const accentRgb = !isTransparent && bgMode === 'color' && bgColor ? hexToRgb(bgColor) : null;

  const getContrastText = (hex: string) => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);

    return luminance > 186 ? "#000000" : "#ffffff";
  };

  // ── Observers ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const modelObserver = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setModelVisible(true); },
      { threshold: 0.1 }
    );
    if (modelRef.current) modelObserver.observe(modelRef.current);

    const postObserver = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          viewStartTime.current = Date.now();
          fetch(`${BACKEND_URL}/api/interactions/playtime-start`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: _id }) }).catch(() => { });
          fetch(`${BACKEND_URL}/api/interactions/view`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: _id }) }).catch(() => { });
        } else {
          if (!viewStartTime.current) return;
          const duration = Math.floor((Date.now() - viewStartTime.current) / 1000);
          viewStartTime.current = null;
          fetch(`${BACKEND_URL}/api/interactions/playtime-end`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: _id, duration }) }).catch(() => { });
        }
      },
      { threshold: 0.4 }
    );
    if (postRef.current) postObserver.observe(postRef.current);
    return () => { modelObserver.disconnect(); postObserver.disconnect(); };
  }, [_id]);

  // ── TRANSPARENT: Feed style ───────────────────────────────────────────────
  if (isTransparent) {
    return (
      <article
        ref={postRef}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          onOpenDetails?.();
        }}
        className="relative w-full border border-white/[0.06] border-l-0 border-r-0 sm:border-l sm:border-r bg-transparent hover:bg-white/[0.03] cursor-pointer transition-colors duration-200"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              {logoUrl ? (
                <img src={logoUrl} alt={brandName || 'Brand'} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-black text-white">
                  {(brandName || user?.username || 'B').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-gray-200 text-xs font-bold tracking-wide drop-shadow-sm">
                {brandName || user?.username || 'Creator'}
              </span>
            </div>
            {/* Ad Badge with matching glass style */}
            <div className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white/90 drop-shadow-sm"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              Ad
            </div>
          </div>

          {description && <p className="text-gray-200 text-sm leading-relaxed mb-3">{description}</p>}

          <div ref={modelRef} className="relative overflow-hidden w-full h-[400px] rounded-2xl bg-black/20 border border-white/[0.08]">
            {modelVisible && modelUrl ? (
              // @ts-ignore
              <model-viewer
                src={modelUrl}
                camera-controls
                auto-rotate
                autoplay
                animation-name="*"
                exposure="1.2"
                environment-image="neutral"
                shadow-intensity="1"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                style={{ width: '100%', height: '600px', backgroundColor: 'transparent' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-white/10 animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </article>
    );
  }

  // ── COLOR / IMAGE: glassmorphism ──────────────────────────────────────────

  const glassCardBase: React.CSSProperties = isImage
    ? {
      backgroundImage: `url(${bgImageUrl})`,
      backgroundSize: resolvedBgSize,
      backgroundPosition: resolvedBgPos,
      backgroundRepeat: 'no-repeat',
      border: '1px solid rgba(255,255,255,0.18)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
    }
    : {
      background: `rgba(0,0,0,${overlayOpacity / 100})`,
      border: `1px solid rgba(${accentRgb},0.3)`,
      boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)`,
    };

  const headerPillStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.22)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.20)',
  };

  // Same styling as headerPillStyle so it's always visible regardless of background hue
  const adBadgeStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.22)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.20)',
    color: '#ffffff',
  };

  const modelAreaStyle: React.CSSProperties = { background: 'transparent' };

  return (
    <article
      ref={postRef}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onOpenDetails?.();
      }}
      className={`relative w-full border border-white/[0.06] border-l-0 border-r-0 sm:border-l sm:border-r cursor-pointer transition-colors duration-200 overflow-hidden ${
        isImage ? 'bg-transparent hover:bg-white/[0.03]' : ''
      }`}
      style={!isImage && bgColor ? { backgroundColor: bgColor } : undefined}
    >
      {/* ── Outer bg for image mode: blurred, low-opacity ── */}
      {isImage && (
        <>
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `url(${bgImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(28px)',
            transform: 'scale(1.12)',
            opacity: 0.45,
          }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: `rgba(0,0,0,${overlayOpacity / 100 * 0.4})` }} />
        </>
      )}

      {/* Grain texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat' }} />

      {/* ── Glass card ── */}
      <div className="relative z-10 m-3 rounded-2xl overflow-hidden" style={glassCardBase}>

        {/* Image mode: pure dark tint only */}
        {isImage && (
          <div className="absolute inset-0 pointer-events-none" style={{ background: `rgba(0,0,0,${overlayOpacity / 100})` }} />
        )}

        {/* All content sits above the overlay */}
        <div className="relative z-10">

          {/* ── Floating brand pill ── */}
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={headerPillStyle}>
              {logoUrl ? (
                <img src={logoUrl} alt={brandName || 'Brand'} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black"
                  style={accentRgb
                    ? { background: `rgba(${accentRgb},0.35)`, color: bgColor! }
                    : { background: 'rgba(255,255,255,0.2)', color: 'white' }
                  }>
                  {(brandName || user?.username || 'B').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-white text-xs font-bold tracking-wide drop-shadow-sm">
                {brandName || user?.username || 'Creator'}
              </span>
            </div>
            {/* Ad Badge */}
            <div className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest drop-shadow-sm" style={adBadgeStyle}>
              Ad
            </div>
          </div>

          {/* ── 3D model ── */}
          <div ref={modelRef} className="relative w-full overflow-hidden" style={{ ...modelAreaStyle, height: '380px' }}>
            {accentRgb && (
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse 60% 50% at 50% 60%, rgba(${accentRgb},0.2) 0%, transparent 70%)` }} />
            )}

            {modelVisible && modelUrl ? (
              // @ts-ignore
              <model-viewer src={modelUrl} camera-controls auto-rotate autoplay animation-name="*"
                exposure="1.15" environment-image="neutral" shadow-intensity="0.8"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                style={{ width: '100%', height: '380px', backgroundColor: 'transparent' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl animate-pulse"
                  style={{ background: accentRgb ? `rgba(${accentRgb},0.15)` : 'rgba(255,255,255,0.08)' }} />
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none"
              style={{ background: isImage ? 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)' : `linear-gradient(to top, rgba(${accentRgb ?? '0,0,0'},0.15), transparent)` }} />
          </div>

          {/* Bottom accent line */}
          <div className="h-0.5 w-full"
            style={accentRgb
              ? { background: `linear-gradient(90deg, transparent, rgba(${accentRgb},0.6), rgba(${accentRgb},0.3), transparent)` }
              : { background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), rgba(255,255,255,0.12), transparent)' }
            } />
        </div>
      </div>
      
      {/* Description */}
      {description && (
        <div className="px-4 pb-3 relative z-10">
          <p
            className="text-sm leading-relaxed font-light tracking-wide"
            style={{
              color:
                bgMode === "color" && bgColor && bgColor !== "transparent"
                  ? getContrastText(bgColor)
                  : "#ffffff",
              textShadow:
                bgMode === "image"
                  ? "0 1px 3px rgba(0,0,0,0.8)"
                  : "none",
            }}
          >
            {description}
          </p>
        </div>
      )}
    </article>
  );
};

export default AdModelPost;