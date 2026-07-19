import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { X, Image as ImageIcon, Box , DollarSign, ZoomIn } from 'lucide-react';
import '@google/model-viewer';
import { useUser } from '../../../context/user';
import { MentionTextarea } from './MentionTextarea';

interface PostModalProps {
  onCancel: () => void;
}

interface Asset {
  id: string;
  file: File;
  previewUrl: string;

  uploadedUrl?: string;   // CloudFront URL
  originalKey?: string;   // S3 key (CRITICAL)
  fieldOfView?: string;

  name: string;
  progress?: number;
  status?: "pending" | "uploading" | "done" | "error";
}

const PostModal: React.FC<PostModalProps> = ({ onCancel }) => {
  const { user } = useUser();
  const logoImage = user?.avatar || '/default_avatar.png';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLElement>(null); // ✅ NEW: Ref for the 3D viewer
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const filesToProcess = [files[0]];

    const newAssets: Asset[] = [];

    filesToProcess.forEach((file) => {
      if (!file.name.endsWith(".glb")) return;

      newAssets.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        fieldOfView: "auto", // ✅ CHANGED: Let the model decide the best initial zoom
      });
    });

    if (newAssets.length) {
      setAssets(newAssets);
      setActiveIndex(0);
    }

    e.target.value = "";
  };

  const handleZoomChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = `${e.target.value}deg`;
    
    // Use a proper immutable update so React detects the deep change
    setAssets((prevAssets) =>
      prevAssets.map((asset, idx) =>
        idx === activeIndex
          ? { ...asset, fieldOfView: newValue } // Create a new object for the active asset
          : asset
      )
    );
  };

  // ✅ NEW: Two-way synchronization between mouse-wheel and slider
  useEffect(() => {
    const viewer = viewerRef.current as any;
    if (!viewer) return;

    // Sync slider when user scrolls mouse wheel
    const handleCameraChange = (e: any) => {
      if (e.detail.source === 'user-interaction') {
        const currentFov = viewer.getFieldOfView();
        setAssets((prevAssets) =>
          prevAssets.map((asset, idx) =>
            idx === activeIndex
              ? { ...asset, fieldOfView: `${Math.round(currentFov)}deg` }
              : asset
          )
        );
      }
    };

    // Sync slider the exact moment the model first loads and calculates "auto"
    const handleLoad = () => {
      const initialFov = viewer.getFieldOfView();
      console.log("Model loaded, initial FOV:", initialFov);
      setAssets((prevAssets) =>
        prevAssets.map((asset, idx) =>
          idx === activeIndex
            ? { ...asset, fieldOfView: `${Math.round(initialFov)}deg` }
            : asset
        )
      );
    };

    viewer.addEventListener('camera-change', handleCameraChange);
    viewer.addEventListener('load', handleLoad);

    return () => {
      viewer.removeEventListener('camera-change', handleCameraChange);
      viewer.removeEventListener('load', handleLoad);
    };
  }, [activeIndex, assets.length]); // Re-bind when active tab or assets change

  const uploadAssetToS3 = async (
    asset: Asset,
    onProgress: (percent: number) => void
  ): Promise<{ fileUrl: string; key: string }> => {
    const res = await fetch(`${BACKEND_URL}/api/upload/presigned-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: asset.file.name,
        fileType: asset.file.type || "model/gltf-binary",
        category: "original",
        fileSize: asset.file.size,
        fieldOfView: asset.fieldOfView,
      }),
    });

    if (!res.ok) throw new Error("Failed to get upload URL");

    const { uploadUrl, key } = await res.json();

    const fileUrl = `${import.meta.env.VITE_GAMES_STORAGE_PRIVATE_CLOUDFRONT}/${key}`;

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader(
        "Content-Type",
        asset.file.type || "model/gltf-binary"
      );

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () =>
        xhr.status === 200 ? resolve() : reject(new Error("Upload failed"));

      xhr.onerror = () => reject(new Error("Upload error"));

      xhr.send(asset.file);
    });

    return { fileUrl, key };
  };

  const handlePostSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    let updatedAssets: Asset[] = [];

    try {
      updatedAssets = [...assets];

      await Promise.all(
        updatedAssets.map(async (asset, index) => {
          updatedAssets[index].status = "uploading";
          updatedAssets[index].progress = 0;
          setAssets([...updatedAssets]);

          const { fileUrl, key } = await uploadAssetToS3(asset, (percent) => {
            updatedAssets[index].progress = percent;
            setAssets([...updatedAssets]);
          });

          updatedAssets[index].uploadedUrl = fileUrl;
          updatedAssets[index].originalKey = key;
          updatedAssets[index].status = "done";
          updatedAssets[index].progress = 100;

          setAssets([...updatedAssets]);
        })
      );

      setIsSavingMetadata(true);

      const response = await fetch(`${BACKEND_URL}/api/allposts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "model_post",
          title,
          description,
          price: Number(price),
          assets: updatedAssets.map((a: Asset) => ({
            name: a.name,
            originalUrl: a.uploadedUrl,
            originalKey: a.originalKey,
            fieldOfView: a.fieldOfView || "45deg", // safe fallback
          })),
        }),
      });

      if (!response.ok) throw new Error("Database save failed");

      setIsSavingMetadata(false);
      setIsSubmitting(false);
      onCancel();

    } catch (err) {
      console.error("Post creation failed", err);

      const uploadedKeys = updatedAssets
        .map((a: Asset) => a.originalKey)
        .filter(Boolean);

      if (uploadedKeys.length > 0) {
        await fetch(`${BACKEND_URL}/api/upload/cleanup`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: uploadedKeys }),
        });
      }

      setIsSavingMetadata(false);
      setIsSubmitting(false);
    }
  };

  const removeAsset = (index: number) => {
    const updated = assets.filter((_, i) => i !== index);
    setAssets(updated);
    if (activeIndex >= updated.length) {
      setActiveIndex(Math.max(0, updated.length - 1));
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white/[0.03] backdrop-blur-2xl min-h-[75vh] rounded-3xl border border-gray-200 dark:border-white/[0.06] flex flex-col overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-transparent z-30 border-b border-gray-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold text-black dark:text-white tracking-tight">Compose 3D Bundle</h2>
        </div>

        <button
          onClick={handlePostSubmit}
          disabled={!title || !description || assets.length === 0 || isSubmitting}
          className="bg-[#3D7A6E] hover:bg-[#2F5E55] disabled:opacity-50 text-white font-bold px-6 py-2 rounded-full transition shadow-sm"
        >
          {isSubmitting ? "Posting..." : "Post"}
        </button>
      </div>

      <div className="flex flex-1 p-6 gap-5 overflow-y-auto custom-scrollbar">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          <div className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] flex items-center justify-center text-gray-400 overflow-hidden">
            {user?.avatar ? (
              <img
                src={logoImage}
                alt={`${user.username || 'User'}'s avatar`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/default_avatar.png';
                }}
              />
            ) : (
              <Box size={20} />
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-5">
          {/* Inputs Section */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Post Title"
              className="w-full text-2xl font-bold bg-transparent border-none outline-none text-black dark:text-white placeholder-gray-500 focus:ring-0 p-0"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <MentionTextarea
              placeholder="What's special about these models?"
              className="w-full text-lg bg-transparent border-none outline-none text-black dark:text-white placeholder-gray-500 resize-none focus:ring-0 min-h-[100px] p-0 mt-2"
              value={description}
              onChange={setDescription}
            />
          </div>

          {/* 3D Asset Management UI */}
          {assets.length > 0 ? (
            <div className="flex flex-col gap-3">
              {/* Main Preview Area */}
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-black/20 group">
                {/* @ts-ignore */}
                <model-viewer
                  ref={viewerRef} // ✅ NEW: Ref attached here
                  src={assets[activeIndex].uploadedUrl || assets[activeIndex].previewUrl}
                  camera-controls
                  auto-rotate
                  exposure="1.0"
                  environment-image="neutral"
                  shadow-intensity="1"
                  field-of-view={assets[activeIndex].fieldOfView || "auto"} // Fallback handles initial render
                  camera-orbit="auto auto auto"
                  bounds="tight"
                  min-field-of-view="1deg" 
                  max-field-of-view="90deg" 
                  style={{ width: "100%", height: "400px", backgroundColor: "transparent" }}
                />

                <div className="absolute top-4 right-4 pointer-events-none bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider">
                  Previewing: {assets[activeIndex].name.substring(0, 15)}{assets[activeIndex].name.length > 15 ? '...' : ''}
                </div>
              </div>
              
              <div className="flex items-center gap-4 px-2 py-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06]">
                <ZoomIn size={18} className="text-gray-400" />
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-500">
                    <span>Zoomed In</span>
                    <span>Zoomed Out</span>
                  </div>
                  <input
                    type="range"
                    min="1" 
                    max="90" 
                    // ✅ CHANGED: Safely parse 'auto' into a temporary visual number while it loads
                    value={
                      assets[activeIndex].fieldOfView === "auto" 
                        ? 45 
                        : parseInt(assets[activeIndex].fieldOfView || "45")
                    }
                    onChange={handleZoomChange}
                    className="w-full accent-[#3D7A6E] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Upload Placeholder */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-gray-200 dark:border-white/[0.1] rounded-2xl py-16 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all group"
            >
              <div className="p-3 rounded-full bg-white/10 dark:bg-white/20 text-white group-hover:scale-110 transition-transform">
                <Box size={32} />
              </div>
              <p className="text-gray-500 font-medium">Upload a .glb assets</p>
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
              Finalizing post & fetching metadata...
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
        accept=".glb"
      />
    </div>
  );
};

export default PostModal;