import React from "react";
import { Upload } from "lucide-react";
import "@google/model-viewer";
import type { AdAsset } from "../../types/Post";
import { hexToRgb, getContrastText } from "../../utils/adModelPreviewUtils";
import AdModelCard from "./AdModelCard";
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

  return (
    <div className="px-4 pb-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Live Preview</p>

      <AdModelCard
        description={description}
        brandName={brandName}
        logoImage={logoImage}
        bgMode={bgMode}
        bgColor={bgColor}
        bgImage={bgImage}
        bgImagePosition={bgImagePosition}
        bgImageSize={bgImageSize}
        overlayOpacity={overlayOpacity}
        ctaText={ctaText}
        ctaColor={ctaColor}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        modelViewer={
          asset ? (
            // @ts-ignore
            <model-viewer
              src={asset.previewUrl}
              camera-controls
              auto-rotate
              exposure="1.15"
              environment-image="neutral"
              shadow-intensity="0.8"
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "transparent",
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-25">
              <Upload size={28} className="text-white" />
              <span className="text-white text-[10px] font-bold uppercase tracking-widest">
                3D Model
              </span>
            </div>
          )
        }
      />
    </div>
  );
};

export default AdModelPostPreview;