import React, { useEffect } from 'react';

interface Asset {
  name: string;
  previewUrl: string;
  uploadedUrl?: string;
  fieldOfView?: string;

  backgroundType?: 'solid' | 'gradient' | 'focus' | 'stripes' | 'spotlight';
  backgroundColor?: string;
  backgroundColor1?: string;
  backgroundColor2?: string;
}

interface ModelViewerSectionProps {
  asset: Asset;
  viewerRef: React.RefObject<HTMLElement | null>;
  onFovChange: (fov: string) => void;
}

export const ModelViewerSection: React.FC<ModelViewerSectionProps> = ({
  asset,
  viewerRef,
  onFovChange,
}) => {
  useEffect(() => {
    const viewer = viewerRef.current as any;
    if (!viewer) return;

    const handleCameraChange = (e: any) => {
      if (e.detail.source === 'user-interaction') {
        const currentFov = viewer.getFieldOfView();
        onFovChange(`${Math.round(currentFov)}deg`);
      }
    };

    const handleLoad = () => {
      const initialFov = viewer.getFieldOfView();
      onFovChange(`${Math.round(initialFov)}deg`);
    };

    viewer.addEventListener('camera-change', handleCameraChange);
    viewer.addEventListener('load', handleLoad);

    return () => {
      viewer.removeEventListener('camera-change', handleCameraChange);
      viewer.removeEventListener('load', handleLoad);
    };
  }, [asset.previewUrl, asset.uploadedUrl, onFovChange, viewerRef]);

  /*
   * ============================================================
   * BACKGROUND PREVIEW
   * ============================================================
   */

  const backgroundType = asset.backgroundType || 'solid';

  const color = asset.backgroundColor || '#00000000';
  const color1 = asset.backgroundColor1 || '#1e293b';
  const color2 = asset.backgroundColor2 || '#0f172a';

  let activeBgStyle: React.CSSProperties;

  switch (backgroundType) {
    case 'gradient':
      activeBgStyle = {
        background: `linear-gradient(
          135deg,
          ${color1} 0%,
          ${color1} 40%,
          ${color2} 100%
        )`,
      };
      break;

    case 'focus':
      activeBgStyle = {
        background: `radial-gradient(
          circle at center,
          ${color1} 0%,
          ${color1} 40%,
          ${color2} 100%
        )`,
      };
      break;

    case 'stripes':
      activeBgStyle = {
        background: `linear-gradient(
          180deg,
          ${color2} 0%,
          ${color1} 35%,
          ${color1} 65%,
          ${color2} 100%
        )`,
      };
      break;

    case 'spotlight':
      activeBgStyle = {
        background: `radial-gradient(
          ellipse 85% 65% at 50% 40%,
          ${color1} 0%,
          ${color1}33 50%,
          ${color2} 100%
        )`,
      };
      break;

    case 'solid':
    default:
      activeBgStyle = {
        backgroundColor: color,
      };
      break;
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-white/[0.06] group transition-all duration-200"
      style={activeBgStyle}
    >
      {/* @ts-ignore */}
      <model-viewer
        ref={viewerRef}
        src={asset.uploadedUrl || asset.previewUrl}
        camera-controls
        auto-rotate
        exposure="1.0"
        environment-image="neutral"
        shadow-intensity="1"
        field-of-view={asset.fieldOfView || 'auto'}
        camera-orbit="auto auto auto"
        bounds="tight"
        min-field-of-view="1deg"
        max-field-of-view="90deg"
        style={{
          width: '100%',
          height: '400px',
          backgroundColor: 'transparent',
        }}
      />

      <div className="absolute top-4 right-4 pointer-events-none bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider">
        Previewing: {asset.name.substring(0, 15)}
        {asset.name.length > 15 ? '...' : ''}
      </div>
    </div>
  );
};