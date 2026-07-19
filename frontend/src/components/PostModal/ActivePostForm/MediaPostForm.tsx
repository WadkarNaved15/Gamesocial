import React, { useState, useRef, ChangeEvent } from 'react';
import { X, Image as ImageIcon, DollarSign, Film, Plus } from 'lucide-react';
import imageCompression from "browser-image-compression";
import { useUser } from '../../../context/user';
import { MentionTextarea } from './MentionTextarea';

interface PostModalProps {
  onCancel: () => void;
}

interface Asset {
  id: string;
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  uploadedKey?: string;
  name: string;
  type: string; // "image" or "video"
  progress?: number;
  status?: "pending" | "uploading" | "done" | "error";
}

const MediaPostForm: React.FC<PostModalProps> = ({ onCancel }) => {
  const { user } = useUser();
  const logoImage = user?.avatar || '/default_avatar.png';
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(''); // Added if you wish to use it later, otherwise can be removed
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 4 - assets.length;
    const filesArray = Array.from(files).slice(0, remainingSlots);
    const validFilesToProcess: File[] = [];

    // Process and validate each file
    for (const file of filesArray) {
      const isVideo = file.type.startsWith("video/");

      if (isVideo) {
        if (file.size > 50 * 1024 * 1024) {
          alert(`Video "${file.name}" exceeds the 50MB limit.`); // Replace with your toast UI
          continue;
        }
        validFilesToProcess.push(file);
      } else {
        // It's an image, compress it first
        const compressedFile = await compressImage(file);
        if (compressedFile.size > 5 * 1024 * 1024) {
          alert(`Image "${file.name}" is still over 5MB after compression.`); // Replace with toast
          continue;
        }
        validFilesToProcess.push(compressedFile);
      }
    }

    const newAssets: Asset[] = validFilesToProcess.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      type: file.type.startsWith('video/') ? 'video' : 'image',
    }));

    if (newAssets.length) {
      setAssets((prev) => [...prev, ...newAssets]);
      if (assets.length === 0) setActiveIndex(0);
    }
    e.target.value = "";
  };



  const uploadAssetToS3 = async (asset: Asset, onProgress: (percent: number) => void): Promise<{ fileUrl: string; key: string }> => {
    // 1. Get the presigned URL
    const res = await fetch(`${BACKEND_URL}/api/upload/presigned-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: asset.file.name,
        fileType: asset.file.type,
        category: "media",
        subcategory: "post",
        fileSize: asset.file.size,
      }),
    });

    if (!res.ok) throw new Error("Failed to get upload URL");
    const { uploadUrl, fileUrl, key } = await res.json();

    // 2. Wrap XHR in a Promise only for the part that actually needs a callback (progress tracking)
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", asset.file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve({
            fileUrl,
            key,
          });
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(asset.file);
    });
  };

  const compressImage = async (file: File): Promise<File> => {
    const fileSizeMB = file.size / 1024 / 1024;

    // 🚫 Skip compression for small images
    if (fileSizeMB < 1) {
      console.log("Skipping compression (small file):", fileSizeMB);
      return file;
    }

    console.log("Compressing image:", fileSizeMB, "MB");

    const options = {
      maxWidthOrHeight: 1080,
      useWebWorker: true,
      initialQuality: 0.8, // 🔥 key change
    };

    try {
      const compressedBlob = await imageCompression(file, options);

      console.log(
        "Compressed:",
        (compressedBlob.size / 1024 / 1024).toFixed(2),
        "MB"
      );

      // ✅ Keep original type (important)
      return new File([compressedBlob], file.name, {
        type: file.type,
      });

    } catch (err) {
      console.error("Compression failed:", err);
      return file;
    }
  };

  const handlePostSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const updatedAssets = [...assets];
      await Promise.all(updatedAssets.map(async (asset, index) => {
        updatedAssets[index].status = "uploading";
        updatedAssets[index].progress = 0;
        setAssets([...updatedAssets]);
        await new Promise(res => setTimeout(res, 100));
        const uploadedData = await uploadAssetToS3(asset, (p) => {
          updatedAssets[index].progress = p;
          setAssets([...updatedAssets]);
        });

        updatedAssets[index].uploadedUrl = uploadedData.fileUrl;
        updatedAssets[index].uploadedKey = uploadedData.key;
        updatedAssets[index].status = "done";
        setAssets([...updatedAssets]);
      }));

      setIsSavingMetadata(true);
      const response = await fetch(`${BACKEND_URL}/api/allposts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "normal_post",
          description,
          assets: updatedAssets.map(a => ({ name: a.name, url: a.uploadedUrl, key: a.uploadedKey, type: a.type })),
        }),
      });
      if (!response.ok) throw new Error();
      onCancel();
    } catch (err) { console.error(err); setIsSubmitting(false); }
  };

  const removeAsset = (index: number) => {
    URL.revokeObjectURL(assets[index].previewUrl); // 🔥 prevent memory leak
    const updated = assets.filter((_, i) => i !== index);
    setAssets(updated);
    if (activeIndex >= updated.length) setActiveIndex(Math.max(0, updated.length - 1));
  };

  return (
    // Minimalist Glassmorphic Container applied here
    <div className="w-full max-w-2xl mx-auto bg-white/[0.03] backdrop-blur-2xl min-h-[75vh] rounded-3xl border border-gray-200 dark:border-white/[0.06] flex flex-col overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-transparent z-30 border-b border-gray-100 dark:border-white/[0.06]">
        <h2 className="text-xl font-bold text-black dark:text-white tracking-tight">Compose Media</h2>
        <button
          onClick={handlePostSubmit}
          disabled={!description || assets.length === 0 || isSubmitting}
          className="bg-[#3D7A6E] hover:bg-[#2F5E55] disabled:opacity-50 text-white font-bold px-6 py-2 rounded-full transition shadow-sm"
        >
          {isSubmitting ? "Posting..." : "Post"}
        </button>
      </div>

      <div className="flex-1 p-6 flex gap-5 overflow-y-auto custom-scrollbar">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          <div className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] flex items-center justify-center text-gray-400 overflow-hidden">
            {user?.avatar ? (
              <img
                src={logoImage}
                alt={`${user.username || 'User'}'s avatar`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  // Fallback if the image URL fails to load
                  e.currentTarget.src = '/default_avatar.png';
                }}
              />
            ) : (
              <ImageIcon size={20} />
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-5">
          <MentionTextarea
            value={description}
            onChange={setDescription}
            placeholder="What's happening?"
            className="w-full text-lg bg-transparent border-none outline-none text-black dark:text-white placeholder-gray-500 resize-none focus:ring-0 min-h-[100px] p-0"
          />

          {assets.length > 0 ? (
            <div className="flex flex-col gap-3">
              {/* Asset Selector Tabs Area */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {assets.map((asset, index) => (
                  <button
                    key={asset.id}
                    onClick={() => setActiveIndex(index)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap ${activeIndex === index
                      ? 'bg-[#3D7A6E] border-[#3D7A6E] text-white shadow-md'
                      : 'bg-transparent dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:border-[#3D7A6E]'
                      }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">{asset.type} {index + 1}</span>
                    <X
                      size={14}
                      className="hover:text-red-200 dark:hover:text-red-400 transition-colors"
                      onClick={(e) => { e.stopPropagation(); removeAsset(index); }}
                    />
                  </button>
                ))}

                {/* Inline "Add" Button appears here after assets are added */}
                {assets.length < 4 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 border border-dashed border-gray-300 dark:border-white/[0.1] rounded-full text-gray-400 hover:text-[#3D7A6E] hover:border-[#3D7A6E] transition"
                    title="Add more media"
                  >
                    <Plus size={18} />
                  </button>
                )}
              </div>

              {/* Preview Display */}
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-black/20 aspect-video flex items-center justify-center">
                {assets[activeIndex].type === 'video' ? (
                  <video
                    src={assets[activeIndex].previewUrl}
                    controls
                    className="max-h-full max-w-full"
                  />
                ) : (
                  <img
                    src={assets[activeIndex].previewUrl}
                    className="max-h-full max-w-full object-contain"
                    alt="preview"
                  />
                )}

                <div className="absolute top-4 right-4 pointer-events-none bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider">
                  {assets[activeIndex].name.substring(0, 15)}{assets[activeIndex].name.length > 15 ? '...' : ''}
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-gray-200 dark:border-white/[0.1] rounded-2xl py-16 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all group"
            >
              <div className="p-3 rounded-full bg-white/10 dark:bg-white/20 text-white group-hover:scale-110 transition-transform">
                <ImageIcon size={32} />
              </div>
              <p className="text-gray-500 font-medium">Add Photos or Videos (Up to 4)</p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Upload Progress Overlay */}
      <div className="space-y-3 px-2 mt-2">
        {/* Metadata Saving Overlay */}
        {isSavingMetadata && (
          <div className="mx-4 p-4 rounded-xl border border-[#3D7A6E]/20 dark:border-[#3D7A6E]/30 bg-[#3D7A6E]/10 flex items-center justify-center gap-3 animate-pulse">
            <div className="w-5 h-5 border-2 border-[#3D7A6E] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-[#3D7A6E] dark:text-[#4A9384]">
              Finalizing post...
            </span>
          </div>
        )}
        {assets.map((asset) => (
          asset.status === "uploading" && (
            <div
              key={asset.id}
              className="mx-4 p-3 rounded-xl border border-gray-100 dark:border-white/[0.08] bg-gray-50/50 dark:bg-black/20 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#3D7A6E] animate-pulse" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    Uploading {asset.name}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-[#3D7A6E] tabular-nums">
                  {asset.progress || 0}%
                </span>
              </div>

              <div className="relative w-full h-1.5 bg-gray-200 dark:bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-[#3D7A6E] transition-all duration-300 ease-out rounded-full shadow-[0_0_8px_rgba(61,122,110,0.4)]"
                  style={{ width: `${asset.progress || 0}%` }}
                />
              </div>
            </div>
          )
        ))}
      </div>


      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*"
        multiple
      />
    </div>
  );
};

export default MediaPostForm;