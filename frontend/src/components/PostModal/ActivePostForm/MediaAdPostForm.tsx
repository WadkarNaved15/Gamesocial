import React, { useState, useRef, ChangeEvent, useEffect } from "react";
import { Upload, Image as ImageIcon, Video, ArrowLeft, X, Palette, Sparkles, Clock, Flame, MousePointerClick } from "lucide-react";
import { useUser } from "../../../context/user";
import MediaAdPostCard from "../../ads/MediaAdPostCard";
type MediaType = "image" | "video";

type MediaAsset = {
  type: MediaType;
  file: File;
  url: string;
  name: string;
};

interface MediaAdPostFormProps {
  onCancel: () => void;
  onBack?: () => void;
}

const PRESET_ACCENTS = [
  { name: "Default Dark", hex: "#18181b", text: "#ffffff" },
  { name: "Cyber Neon", hex: "#6366f1", text: "#ffffff" },
  { name: "Royal Amethyst", hex: "#8b5cf6", text: "#ffffff" },
  { name: "Electric Emerald", hex: "#10b981", text: "#ffffff" },
  { name: "Sunset Crimson", hex: "#ef4444", text: "#ffffff" },
  { name: "Gold Premium", hex: "#f59e0b", text: "#000000" },
];

const hexToRgb = (hex: string): string | null => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}` : null;
};

const MediaAdPostForm: React.FC<MediaAdPostFormProps> = ({ onCancel, onBack }) => {
  // ───────────── STATE ─────────────
  const [description, setDescription] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const [accentColor, setAccentColor] = useState("#6366f1"); // Cyber Neon default for scroll impact
  const [useGlowEffect, setUseGlowEffect] = useState(true);
  const [cardLayoutTheme, setCardLayoutTheme] = useState<"glass" | "gradient" | "minimal">("glass");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [asset, setAsset] = useState<MediaAsset | null>(null);

  const [activeTab, setActiveTab] = useState<"media" | "brand" | "theme" | "cta">("media");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ───────────── SCROLL-STOPPER ENGINE STATES ─────────────
  const [interactiveTilt, setInteractiveTilt] = useState(true);
  const { user } = useUser();
  const brandName = user?.username || "Guest Brand";
  const logo = user?.avatar || "/default_avatar.png";
  const previewCardRef = useRef<HTMLDivElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);


  // ───────────── MOUSE PARALLAX TILT INTERRUPT ─────────────
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactiveTilt || !previewCardRef.current) return;
    const card = previewCardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xc = rect.width / 2;
    const yc = rect.height / 2;

    const angleX = (yc - y) / 25;
    const angleY = (x - xc) / 25;

    card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg)`;
  };

  const handleMouseLeave = () => {
    if (!previewCardRef.current) return;
    previewCardRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
  };

  // ───────────── HANDLERS ─────────────
  const handleMedia = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const isVideo = file.type.startsWith("video");

    // Catch limits before hitting the backend
    if (isVideo && file.size > 50 * 1024 * 1024) {
      alert("Video is too large. Maximum allowed size is 50 MB."); // Replace with your toast notification
      e.target.value = "";
      return;
    }
    
    if (!isVideo && file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Maximum allowed size is 5 MB."); // Replace with your toast notification
      e.target.value = "";
      return;
    }

    setAsset({
      type: isVideo ? "video" : "image",
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    });
    e.target.value = "";
  };

 const uploadAssetToS3 = async (
    file: File,
    onProgress: (p: number) => void
  ) => {
    const res = await fetch(`${BACKEND_URL}/api/upload/presigned-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        category: "media",
        subcategory: "post", 
        fileSize: file.size,
      }),
    });

    const { uploadUrl, fileUrl, key } = await res.json();

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => resolve();
      xhr.onerror = reject;
      xhr.send(file);
    });

    return { fileUrl, key };
  };

  const handleSubmit = async () => {
    if (isSubmitting || !asset) return;

    setIsSubmitting(true);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // ───────────── PHASE 1: Upload to S3 ─────────────
      const uploaded = await uploadAssetToS3(asset.file, (p) => {
        setUploadProgress(p);
      });

      setIsUploading(false);
      setIsSavingMetadata(true);

      // ───────────── PHASE 2: Save to MongoDB ─────────────
      const payload = {
        type: "media_ad_post",
        description,

        mediaAdPost: {
          brandName: user?.username || "Guest Brand",
          brandLogo: user?.avatar || null,

          description,
          ctaText,
          ctaLink,

          asset: {
            name: asset.name,
            type: asset.type,
            url: uploaded.fileUrl,
            key: uploaded.key,
          },

          style: {
            accentColor,
            useGlowEffect,
            cardLayoutTheme,
          },
        },
      };

      const res = await fetch(`${BACKEND_URL}/api/allposts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create post");

      onCancel();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
      setIsSavingMetadata(false);
      setUploadProgress(0);
    }
  };

  const rgbAccent = hexToRgb(accentColor) || "24, 24, 27";

  const getDynamicCardStyles = (): React.CSSProperties => {
    const baseGlow = useGlowEffect ? `0 20px 50px rgba(${rgbAccent}, 0.28)` : "0 12px 40px rgba(0, 0, 0, 0.3)";

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

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col rounded-2xl overflow-hidden border border-gray-200 shadow-xl bg-white">

      {/* ── Form Header ─── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <ArrowLeft size={18} className="text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-black leading-tight"> Media Ad Builder</h2>
              <span className="bg-indigo-500/10 text-indigo-500 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">Scroll Stopper v2.5</span>
            </div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">High Engagement Conversion Engine</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!asset || isSubmitting}
          className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white font-bold px-5 py-1.5 rounded-full text-sm transition shadow-sm flex items-center gap-1.5"
        >
          {isSubmitting ? "Processing..." : "Publish Premium Ad"}
        </button>
      </div>

      {/* ── Tab Nav ─── */}
      <div className="flex border-b border-gray-200 px-4 bg-white overflow-x-auto [scrollbar-width:none]">
        {(["media", "brand", "theme", "cta"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px shrink-0 ${activeTab === tab
              ? "border-indigo-500 text-indigo-500"
              : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-col flex-1">
        <div className="p-4 flex flex-col gap-4">

          {/* ── MEDIA TAB ─── */}
          {activeTab === "media" && (
            <div className="flex flex-col gap-4">
              {asset ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-300 bg-white h-[360px] flex items-center justify-center">
                  {asset.type === "video" ? (
                    <video src={asset.url} autoPlay muted loop className="w-full h-full object-contain" />
                  ) : (
                    <img src={asset.url} alt="Uploaded preview" className="w-full h-full object-contain" />
                  )}
                  <button
                    onClick={() => setAsset(null)}
                    className="absolute top-3 right-3 p-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-black/80 transition"
                  >
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    {asset.type === "video" ? <Video size={10} /> : <ImageIcon size={10} />}
                    <span className="truncate max-w-[180px]">{asset.name}</span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => mediaInputRef.current?.click()}
                  className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/40 rounded-xl py-16 flex flex-col items-center gap-3 cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all group"
                >
                  <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-400 group-hover:scale-110 transition-transform">
                    <Upload size={28} />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Upload creative media payload</p>
                  <p className="text-gray-400 dark:text-gray-600 text-xs">High-definition 16:9 or 1:1 Videos/Images</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "brand" && (
            <div className="flex flex-col gap-4">

              {/* Brand Name (READ ONLY) */}
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                  Brand Identity (From Profile)
                </label>

                <div className="w-full flex items-center gap-3 bg-white border border-gray-300 rounded-xl px-4 py-3">
                  <img
                    src={user?.avatar || "/default_avatar.png"}
                    className="w-8 h-8 rounded-full object-cover border border-indigo-500"
                  />
                  <span className="text-sm font-semibold text-black">
                    {user?.username || "Guest Brand"}
                  </span>
                </div>
              </div>

              {/* Caption stays editable */}
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                  High-Conversion Ad Script Caption
                </label>

                <textarea
                  placeholder="Draft copy that prompts an instant interaction hook..."
                  className="w-full text-sm bg-white border border-gray-300 rounded-xl p-3 outline-none text-black resize-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition min-h-[90px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

            </div>
          )}

          {activeTab === "theme" && (
            <div className="flex flex-col gap-5">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                  <Palette size={12} className="text-indigo-500" /> Accent Aura Hue Selection
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_ACCENTS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setAccentColor(preset.hex)}
                      className={`p-2.5 rounded-xl text-xs font-semibold transition-all border text-center relative flex flex-col items-center gap-1.5 ${accentColor === preset.hex
                        ? "border-white bg-zinc-900 shadow-md scale-105"
                        : "border-gray-200 dark:border-zinc-800 bg-white/50"
                        }`}
                    >
                      <span className="w-4 h-4 rounded-full shadow-inner block" style={{ backgroundColor: preset.hex }} />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-full">{preset.name}</span>
                      {accentColor === preset.hex && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-3 bg-white/40 p-3 rounded-xl border border-gray-100 dark:border-zinc-800">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-black">Fine-tune Ambient Color</p>
                    <p className="text-[10px] text-gray-400">Match exactly with your visual art guidelines</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                  Feed Isolation Archetype
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["glass", "gradient", "minimal"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCardLayoutTheme(mode)}
                      className={`p-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all text-center ${cardLayoutTheme === mode
                        ? "bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/20 scale-[1.02]"
                        : "bg-white/70 border-gray-200 dark:border-zinc-800 text-gray-400"
                        }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400" />
                  <div>
                    <p className="text-xs font-bold text-black">Inject Ambient Neon Backdrop Glow</p>
                    <p className="text-[10px] text-gray-400">Creates depth shadows to isolate item from typical feed arrays</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={useGlowEffect}
                  onChange={(e) => setUseGlowEffect(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-zinc-700 bg-zinc-900 rounded focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {activeTab === "cta" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                  Action Link Interactive Button Label
                </label>
                <input
                  type="text"
                  placeholder="e.g., CLAIM ACCESS, DISCOVER NOW, JOIN PREORDER"
                  className="w-full text-sm bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none text-black focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
                  Target Redirection Destination Link
                </label>
                <input
                  type="url"
                  placeholder="https://yourbrand.io/exclusive-landing"
                  className="w-full text-sm bg-white border border-gray-300 rounded-xl px-4 py-3 outline-none text-black focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                  value={ctaLink}
                  onChange={(e) => setCtaLink(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── LIVE PREVIEW PANEL (VERTICAL ALIGNED WITH PARALLAX INTERRUPT) ── */}
          <div className="mt-4 border-t border-gray-100 dark:border-zinc-800 pt-6">
            <div className="mb-3 flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest text-gray-400 dark:text-zinc-500">
              <MousePointerClick size={12} /> Live Device Canvas (Hover or Move Cursor to simulate 3D feed disruption)
            </div>

            <div className="relative w-full overflow-hidden p-4 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center">
              <MediaAdPostCard
                brandName={brandName}
                brandLogo={logo}
                description={description}
                ctaText={ctaText}
                ctaLink={ctaLink}
                asset={asset}
                accentColor={accentColor}
                useGlowEffect={useGlowEffect}
                cardLayoutTheme={cardLayoutTheme}
                rgbAccent={rgbAccent}
                interactiveTilt={true}
              />
            </div>
          </div>

        </div>
      </div>
      {isUploading && (
        <div className="p-3 rounded-xl border bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 text-sm">
          <div className="flex justify-between mb-2">
            <span>Uploading media...</span>
            <span>{uploadProgress}%</span>
          </div>

          <div className="h-2 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
      {isSavingMetadata && (
        <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 text-sm animate-pulse">
          Finalizing post & saving to database...
        </div>
      )}
      {/* Hidden File Inputs */}
      <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMedia} />
    </div>
  );
};

export default MediaAdPostForm;