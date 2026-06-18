import React, { useState, useRef, ChangeEvent } from "react";
import { ArrowLeft, Upload, Video, X, Play, LayoutGrid } from "lucide-react";
import { useUser } from "../../../context/user";
import PrerollAdPostCard from "../../ads/PrerollAdPostCard";

interface PrerollAdPostFormProps {
  onCancel: () => void;
  onBack?: () => void;
}

type VideoAsset = {
  file: File;
  url: string;
  name: string;
};

const PrerollAdPostForm: React.FC<PrerollAdPostFormProps> = ({ onCancel, onBack }) => {
  const { user } = useUser();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  // ───────────── ADMINISTRATIVE STATE ─────────────
  const [activeTab, setActiveTab] = useState<"payload" | "display">("payload");
  const [ctaText, setCtaText] = useState("VISIT NOW");
  const [ctaLink, setCtaLink] = useState("");
  const [asset, setAsset] = useState<VideoAsset | null>(null);
  const duration = 15; // Kept fixed at 15s standard for runtime calculations
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

const handleMedia = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Pre-roll placements strictly accept video payloads only.");
      e.target.value = "";
      return;
    }

    // Catch limits before hitting the backend
    if (file.size > 50 * 1024 * 1024) {
      alert("Video is too large. Maximum allowed size is 50 MB."); // Replace with your toast notification
      e.target.value = "";
      return;
    }

    setAsset({
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
      headers: {
        "Content-Type": "application/json",
      },
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

    return {
      fileUrl,
      key,
    };
  };

  const handleSubmit = async () => {
    if (isSubmitting || !asset) return;

    setIsSubmitting(true);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload video to S3
      const uploaded = await uploadAssetToS3(asset.file, (p) => {
        setUploadProgress(p);
      });

      setIsUploading(false);
      setIsSavingMetadata(true);

      const payload = {
        prerollAdPost: {
          brandName: user?.username || "Guest Publisher",
          brandLogo: user?.avatar || null,
          ctaText,
          ctaLink,

          asset: {
            name: asset.name,
            type: "video",
            url: uploaded.fileUrl,
            key: uploaded.key,
          },

          mechanics: {
            duration,
          },
        },
      };

      const res = await fetch(`${BACKEND_URL}/api/prerollads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to create preroll ad");
      }

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

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-[#191919]">

      {/* HEADER SECTION */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#191919] sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <ArrowLeft size={16} className="text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-wider">Stream Engine Pre-Roll Ad Builder</h2>
              <span className="bg-purple-500/10 text-purple-400 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Video Node v3.0</span>
            </div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Inject clean motion media slots inside allocations</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!asset || isSubmitting}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-30 text-white text-xs font-black uppercase tracking-widest px-5 py-2 rounded-full transition shadow-md"
        >
          {isSubmitting ? "Deploying Engine..." : "Inject Slot"}
        </button>
      </div>

      {/* TABS CONTROLLER */}
      <div className="flex border-b border-gray-100 dark:border-zinc-800 px-4 bg-white dark:bg-[#191919]">
        {[
          { id: "payload", name: "1. Video Payload", icon: <Video size={12} /> },
          { id: "display", name: "2. Direct Action (CTA)", icon: <LayoutGrid size={12} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-colors border-b-2 -mb-px ${activeTab === tab.id ? "border-purple-500 text-purple-500" : "border-transparent text-gray-400 hover:text-zinc-200"
              }`}
          >
            {tab.icon}
            {tab.name}
          </button>
        ))}
      </div>

      {/* CORE WRAPPER */}
      <div className="p-5 flex flex-col gap-5 flex-1 min-h-[320px]">

        {/* TAB 1: MEDIA INGESTION */}
        {activeTab === "payload" && (
          <div className="flex flex-col gap-4">
            {asset ? (
              <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-black h-[240px] flex items-center justify-center">
                <video src={asset.url} autoPlay muted loop className="w-full h-full object-contain" />
                <button
                  onClick={() => setAsset(null)}
                  className="absolute top-3 right-3 p-2 bg-black/70 text-white rounded-full hover:bg-black transition"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => mediaInputRef.current?.click()}
                className="border-2 border-dashed border-purple-900/30 dark:border-purple-900/50 rounded-xl py-12 flex flex-col items-center gap-2 cursor-pointer hover:bg-purple-900/5 transition-all group"
              >
                <div className="p-3.5 rounded-full bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                  <Upload size={24} />
                </div>
                <p className="text-zinc-400 font-bold text-xs uppercase tracking-wider">Upload Video Asset Canvas</p>
                <p className="text-zinc-500 text-[10px]">Supports MP4, WebM format streams</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TARGET REDIRECTION & LABELS */}
        {activeTab === "display" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Interactive Action Text</label>
              <input
                type="text"
                value={ctaText}
                placeholder="e.g. VISIT NOW"
                onChange={(e) => setCtaText(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-black dark:text-white font-bold tracking-wide"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Target Redirection Destination Link</label>
              <input
                type="url"
                value={ctaLink}
                placeholder="https://yourgamestudio.io/alpha"
                onChange={(e) => setCtaLink(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs text-black dark:text-white"
              />
            </div>
          </div>
        )}

        {/* LIVE SIMULATOR DISPLAY SCREEN */}
        <div className="mt-2 border-t border-gray-100 dark:border-zinc-800 pt-5">
          <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-zinc-400 mb-2">
            <Play size={12} className="text-purple-500 animate-pulse" /> Sandbox Controller Allocation Screen
          </div>
          <div className="w-full bg-zinc-50 dark:bg-[#111112] border border-gray-200 dark:border-zinc-800 p-4 rounded-2xl flex items-center justify-center">
            <PrerollAdPostCard
              brandName={user?.username || "Guest Publisher"}
              brandLogo={user?.avatar || null}
              ctaText={ctaText}
              ctaLink={ctaLink}
              asset={asset ? { type: "video", url: asset.url, name: asset.name } : null}
              duration={duration}
            />
          </div>
        </div>

      </div>

      <input ref={mediaInputRef} type="file" accept="video/*" className="hidden" onChange={handleMedia} />
      {isUploading && (
        // Added explicit border colors to match the theme
        <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-900/30 bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 text-sm">
          <div className="flex justify-between mb-2">
            <span>Uploading video...</span>
            <span>{uploadProgress}%</span>
          </div>

          <div className="h-2 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
      {isSavingMetadata && (
        <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 text-sm animate-pulse">
          Finalizing pre-roll ad & saving to database...
        </div>
      )}
    </div>
  );
};

export default PrerollAdPostForm;