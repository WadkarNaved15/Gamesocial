import React from "react";
import type { MediaAdPostProps } from "../../types/Post";
import MediaAdPostCard from "../../components/ads/MediaAdPostCard";

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

  // ─── VIDEO OPTIMIZATION FALLBACK ───
  const isVideo = asset?.type === "video";
  const isVideoCompleted = asset?.processingStatus === "completed";

  const displayUrl = (isVideo && isVideoCompleted && asset?.optimizedUrl)
    ? asset.optimizedUrl
    : asset?.url;

  const displayAsset = asset ? {
    ...asset,
    url: displayUrl, 
  } : undefined;

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
      <div className="w-full">
        <MediaAdPostCard
          brandName={brandName}
          brandLogo={brandLogo}
          description={description}
          ctaText={ctaText}
          ctaLink={ctaLink}
          asset={displayAsset}
          accentColor={accentColor}
          useGlowEffect={useGlowEffect}
          cardLayoutTheme={cardLayoutTheme}
          rgbAccent={rgbAccent}
          interactiveTilt={true} 
        />
      </div>
    </article>
  );
};

export default MediaAdPost;