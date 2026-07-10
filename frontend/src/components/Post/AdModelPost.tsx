import React, { useEffect, useRef, useState } from 'react';
import '@google/model-viewer';
import type { AdModelPostProps } from '../../types/Post';
import AdModelCard from '../ads/AdModelCard';

const AdModelPost: React.FC<AdModelPostProps> = ({
  _id,
  user,
  description,
  adModelPost,
  onOpenDetails,
}) => {
  const postRef = useRef<HTMLElement>(null);
  const modelRef = useRef<HTMLDivElement>(null); // For the IntersectionObserver
  const modelViewerRef = useRef<HTMLElement | null>(null); // For the actual 3D model
  
  const viewStartTime = useRef<number | null>(null);
  const [modelVisible, setModelVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentFov, setCurrentFov] = useState("auto"); // State for FOV
  
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  if (!adModelPost) return null;
  const { 
    brandName, logoUrl, bgMode, bgColor, bgImageUrl, bgImagePosition, 
    bgImageSize, overlayOpacity = 30, asset, ctaText, ctaLink, style 
  } = adModelPost;
    
  const modelUrl =
    asset?.optimization?.status === 'completed' && asset.optimizedUrl
      ? asset.optimizedUrl
      : asset?.originalUrl;

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
          fetch(`${BACKEND_URL}/api/interactions/playtime-start`, { 
            method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: _id }) 
          }).catch(() => { });
          fetch(`${BACKEND_URL}/api/interactions/view`, { 
            method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: _id }) 
          }).catch(() => { });
        } else {
          if (!viewStartTime.current) return;
          const duration = Math.floor((Date.now() - viewStartTime.current) / 1000);
          viewStartTime.current = null;
          fetch(`${BACKEND_URL}/api/interactions/playtime-end`, { 
            method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: _id, duration }) 
          }).catch(() => { });
        }
      },
      { threshold: 0.4 }
    );
    if (postRef.current) postObserver.observe(postRef.current);
    return () => { modelObserver.disconnect(); postObserver.disconnect(); };
  }, [_id, BACKEND_URL]);

  // ── Camera Zoom Fix ────────────────────────────────────────────────────────
  useEffect(() => {
    const viewer = modelViewerRef.current as any;
    if (!viewer || !asset?.fieldOfView) return;

    const handleModelLoad = () => {
      // The 3D model has fully downloaded, apply custom FOV
      setCurrentFov(asset?.fieldOfView?.trim() || "auto");
      
      // Force it to snap without a smooth animation delay
      if (typeof viewer.jumpCameraToGoal === 'function') {
        setTimeout(() => viewer.jumpCameraToGoal(), 10);
      }
    };

    viewer.addEventListener('load', handleModelLoad);

    return () => {
      viewer.removeEventListener('load', handleModelLoad);
    };
  }, [asset?.fieldOfView, modelUrl, modelVisible]); // Added modelVisible so it attaches after IntersectionObserver triggers

  return (
    <article
      ref={postRef}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onOpenDetails?.();
      }}
      className="relative w-full border border-white/[0.06] sm:border-l sm:border-r bg-transparent hover:bg-white/[0.03] cursor-pointer transition-colors duration-200"
    >
      <AdModelCard
        description={description}
        brandName={brandName || user?.username || ""}
        logoImage={logoUrl || ""}
        bgMode={bgMode}
        bgColor={bgColor ?? "transparent"}
        bgImage={bgImageUrl ?? null}
        bgImagePosition={bgImagePosition ?? "center"}
        bgImageSize={bgImageSize ?? "cover"}
        overlayOpacity={overlayOpacity}
        ctaText={ctaText ?? ""}
        ctaColor={style?.ctaColor || "#ffffff"}
        cTaLink={ctaLink ?? undefined}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        modelViewer={
          <div
            ref={modelRef}
            className="w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {modelVisible && modelUrl ? (
              /* @ts-ignore */
              <model-viewer
                ref={modelViewerRef} // The new ref for the web component
                src={modelUrl}
                camera-controls
                auto-rotate
                autoplay
                animation-name="*"
                exposure="1.2"
                environment-image="neutral"
                shadow-intensity="1"
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: "transparent",
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-white/10 animate-pulse" />
              </div>
            )}
          </div>
        }
      />
    </article>
  );
};

export default AdModelPost;