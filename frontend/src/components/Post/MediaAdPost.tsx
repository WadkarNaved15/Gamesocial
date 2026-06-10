import React from "react";
import type { MediaAdPostProps } from "../../types/Post";
import MediaAdPostCard from "../../components/ads/MediaAdPostCard";
import { trackEvent } from "../../utils/analytics";

type Props = MediaAdPostProps & {
  onOpenDetails?: () => void;
};
type CardTheme = "glass" | "gradient" | "minimal";
/**
 * Utility to convert saved database Hex colors to RGB string channels
 * This satisfies the real-time translucent box-shadow engines in the card UI
 */
const hexToRgbString = (hex: string): string => {
  const normalizedHex = hex.replace("#", "");
  const r = parseInt(normalizedHex.substring(0, 2), 16);
  const g = parseInt(normalizedHex.substring(2, 4), 16);
  const b = parseInt(normalizedHex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return "99, 102, 241"; // Safe dynamic fallback matching Indigo theme default
  }
  return `${r}, ${g}, ${b}`;
};

const MediaAdPost: React.FC<Props> = ({
  mediaAdPost,
  onOpenDetails,
}) => {
  if (!mediaAdPost) return null;

  const {
    _id,
    brandName,
    brandLogo,
    description,
    ctaText,
    ctaLink,
    asset,
    style: databaseStyle,
  } = mediaAdPost;

  // Extract style configuration while guarding against old or unstyled documents
  const accentColor = databaseStyle?.accentColor || "#6366f1";
  const useGlowEffect = databaseStyle?.useGlowEffect ?? true;
  const cardLayoutTheme: CardTheme =
    databaseStyle?.cardLayoutTheme === "glass" ||
      databaseStyle?.cardLayoutTheme === "gradient" ||
      databaseStyle?.cardLayoutTheme === "minimal"
      ? databaseStyle.cardLayoutTheme
      : "glass";

  // Derive the required rgb variant for shadows and glows
  const rgbAccent = hexToRgbString(accentColor);

  const handleCtaClick = () => {
  trackEvent({
    eventType: "ad_click",
    targetType: "ad",
    targetId: _id,

    metadata: {
      adType: "media_ad_post",
      brand: brandName,
      ctaText,
      ctaLink,
    },
  });
};

  
  return (
    <article
      // onClick={() => onOpenDetails?.()}
      className="
        relative w-full
        border border-gray-200 dark:border-white/10
        border-l-0 border-r-0
        sm:border-l sm:border-r
        bg-white dark:bg-[#191919]
        hover:bg-[#F7F9F9] dark:hover:bg-[#16181C]
        cursor-pointer
        px-4 py-3
        flex justify-center
      "
    >
      {/* This wrapper is now full width, meaning it matches NormalPost exactly.
        If your feed container has its own max-width constraints (e.g. max-w-2xl), 
        this will scale smoothly to fill it.
      */}
      <div className="w-full">
        <MediaAdPostCard
          brandName={brandName}
          brandLogo={brandLogo}
          description={description}
          ctaText={ctaText}
          ctaLink={ctaLink}
          asset={asset}
          accentColor={accentColor}
          useGlowEffect={useGlowEffect}
          cardLayoutTheme={cardLayoutTheme}
          rgbAccent={rgbAccent}
          interactiveTilt={true}
          onCtaClick={handleCtaClick}
        />
      </div>
    </article>
  );
};

export default MediaAdPost;