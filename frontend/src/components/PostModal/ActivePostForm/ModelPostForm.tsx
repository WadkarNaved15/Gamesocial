// src/components/post/PostModal.tsx
import React, { useState, useRef, ChangeEvent } from 'react';
import { Box } from 'lucide-react';
import '@google/model-viewer';
import { useUser } from '../../../context/user';
import { MentionTextarea } from './MentionTextarea';
import { ModelViewerSection } from './PostComponents/ModelViewerSection';
import { BackgroundControls, BgType } from './PostComponents/BackgroundControls';

interface Asset {
  id: string;
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  originalKey?: string;

  fieldOfView?: string;

  backgroundType?: BgType;
  backgroundColor?: string;
  backgroundColor1?: string;
  backgroundColor2?: string;

  name: string;
  progress?: number;
  status?: 'pending' | 'uploading' | 'done' | 'error';
}

interface PostModalProps {
  onCancel: () => void;
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

  // Background Control States
  
  const [gradientColor1, setGradientColor1] = useState('#1e293b');
  const [gradientColor2, setGradientColor2] = useState('#0f172a');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLElement>(null);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const filesToProcess = [files[0]];
    const newAssets: Asset[] = [];

    filesToProcess.forEach((file) => {
      if (!file.name.endsWith('.glb')) return;

      newAssets.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        fieldOfView: 'auto',

        backgroundType: 'solid',
        backgroundColor: '#00000000',
        backgroundColor1: '#1e293b',
        backgroundColor2: '#0f172a',
      });
    });

    if (newAssets.length) {
      setAssets(newAssets);
      setActiveIndex(0);
    }

    e.target.value = '';
  };

  const handleZoomChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = `${e.target.value}deg`;
    updateActiveAsset({ fieldOfView: newValue });
  };

  const handleFovChange = (fov: string) => {
    updateActiveAsset({ fieldOfView: fov });
  };

  const updateActiveAsset = (updates: Partial<Asset>) => {
    setAssets((prevAssets) =>
      prevAssets.map((asset, idx) =>
        idx === activeIndex ? { ...asset, ...updates } : asset
      )
    );
  };

  const handleSolidColorChange = (color: string) => {
    updateActiveAsset({
      backgroundType: 'solid',
      backgroundColor: color,
    });
  };

  const handleGradientChange = (c1: string, c2: string) => {
    updateActiveAsset({
      backgroundType: 'gradient',
      backgroundColor1: c1,
      backgroundColor2: c2,
    });
  };

  const handleStripesGradientChange = (primary: string, secondary: string) => {
    updateActiveAsset({
      backgroundType: 'stripes',
      backgroundColor1: primary,
      backgroundColor2: secondary,
    });
  };

  const handleSpotlightGradientChange = (c1: string, c2: string) => {
    updateActiveAsset({
      backgroundType: 'spotlight',
      backgroundColor1: c1,
      backgroundColor2: c2,
    });
  };

  const handleFocusGradientChange = (c1: string, c2: string) => {
    updateActiveAsset({
      backgroundType: 'focus',
      backgroundColor1: c1,
      backgroundColor2: c2,
    });
  };

  const handleBgTypeChange = (type: BgType) => {

    if (type === 'solid') {
      updateActiveAsset({
        backgroundType: 'solid',
      });
      return;
    }

    updateActiveAsset({
      backgroundType: type,
      backgroundColor1: gradientColor1,
      backgroundColor2: gradientColor2,
    });
  };

  const handleGradientColor1Change = (color: string) => {
    setGradientColor1(color);

    if (!activeAsset) return;

    updateActiveAsset({
      backgroundColor1: color,
    });
  };

  const handleGradientColor2Change = (color: string) => {
    setGradientColor2(color);

    if (!activeAsset) return;

    updateActiveAsset({
      backgroundColor2: color,
    });
  };

  const uploadAssetToS3 = async (
    asset: Asset,
    onProgress: (percent: number) => void
  ): Promise<{ fileUrl: string; key: string }> => {
    const res = await fetch(`${BACKEND_URL}/api/upload/presigned-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: asset.file.name,
        fileType: asset.file.type || 'model/gltf-binary',
        category: 'original',
        fileSize: asset.file.size,
        fieldOfView: asset.fieldOfView,
      }),
    });

    if (!res.ok) throw new Error('Failed to get upload URL');

    const { uploadUrl, key } = await res.json();
    const fileUrl = `${import.meta.env.VITE_GAMES_STORAGE_PRIVATE_CLOUDFRONT}/${key}`;

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', asset.file.type || 'model/gltf-binary');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () =>
        xhr.status === 200 ? resolve() : reject(new Error('Upload failed'));

      xhr.onerror = () => reject(new Error('Upload error'));

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
          updatedAssets[index].status = 'uploading';
          updatedAssets[index].progress = 0;
          setAssets([...updatedAssets]);

          const { fileUrl, key } = await uploadAssetToS3(asset, (percent) => {
            updatedAssets[index].progress = percent;
            setAssets([...updatedAssets]);
          });

          updatedAssets[index].uploadedUrl = fileUrl;
          updatedAssets[index].originalKey = key;
          updatedAssets[index].status = 'done';
          updatedAssets[index].progress = 100;

          setAssets([...updatedAssets]);
        })
      );

      setIsSavingMetadata(true);

      const response = await fetch(`${BACKEND_URL}/api/allposts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'model_post',
          title,
          description,
          price: Number(price),
          assets: updatedAssets.map((a: Asset) => ({
            name: a.name,
            originalUrl: a.uploadedUrl,
            originalKey: a.originalKey,
            fieldOfView: a.fieldOfView || '45deg',
            background: {
              type: a.backgroundType || 'solid',
              color: a.backgroundColor || '#00000000',
              color1: a.backgroundColor1 || '#1e293b',
              color2: a.backgroundColor2 || '#0f172a',
            },
          })),
        }),
      });

      if (!response.ok) throw new Error('Database save failed');

      setIsSavingMetadata(false);
      setIsSubmitting(false);
      onCancel();
    } catch (err) {
      console.error('Post creation failed', err);

      const uploadedKeys = updatedAssets
        .map((a: Asset) => a.originalKey)
        .filter(Boolean);

      if (uploadedKeys.length > 0) {
        await fetch(`${BACKEND_URL}/api/upload/cleanup`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keys: uploadedKeys }),
        });
      }

      setIsSavingMetadata(false);
      setIsSubmitting(false);
    }
  };

  const activeAsset = assets[activeIndex];

  return (
    <div className="w-full max-w-2xl mx-auto bg-white/[0.03] backdrop-blur-2xl min-h-[75vh] rounded-3xl border border-gray-200 dark:border-white/[0.06] flex flex-col overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-transparent z-30 border-b border-gray-100 dark:border-white/[0.06]">
        <h2 className="text-xl font-bold text-black dark:text-white tracking-tight">
          Compose 3D Bundle
        </h2>
        <button
          onClick={handlePostSubmit}
          disabled={!title || !description || assets.length === 0 || isSubmitting}
          className="bg-[#3D7A6E] hover:bg-[#2F5E55] disabled:opacity-50 text-white font-bold px-6 py-2 rounded-full transition shadow-sm"
        >
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </div>

      <div className="flex flex-1 p-6 gap-5 overflow-y-auto custom-scrollbar">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          <div className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] flex items-center justify-center text-gray-400 overflow-hidden">
            {user?.avatar ? (
              <img
                src={logoImage}
                alt="Avatar"
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
          {/* Form Inputs */}
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

          {/* 3D Model Viewer & Controls */}
          {assets.length > 0 ? (
            <div className="flex flex-col gap-3">
              <ModelViewerSection
                asset={activeAsset}
                viewerRef={viewerRef}
                onFovChange={handleFovChange}
              />

              <BackgroundControls
                activeAsset={activeAsset}
                bgType={activeAsset.backgroundType || 'solid'}
                gradientColor1={gradientColor1}
                gradientColor2={gradientColor2}
                onBgTypeChange={handleBgTypeChange}
                onSolidColorChange={handleSolidColorChange}
                onGradientChange={handleGradientChange}
                onFocusGradientChange={handleFocusGradientChange}
                onStripesGradientChange={handleStripesGradientChange}
                onSpotlightGradientChange={handleSpotlightGradientChange}
                onZoomChange={handleZoomChange}
                onGradientColor1Change={handleGradientColor1Change}
                onGradientColor2Change={handleGradientColor2Change}
              />
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-gray-200 dark:border-white/[0.1] rounded-2xl py-16 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all group"
            >
              <div className="p-3 rounded-full bg-white/10 dark:bg-white/20 text-white group-hover:scale-110 transition-transform">
                <Box size={32} />
              </div>
              <p className="text-gray-500 font-medium">Upload a .glb asset</p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Overlay */}
      <div className="space-y-3 px-2 mt-2">
        {isSavingMetadata && (
          <div className="mx-4 p-4 rounded-xl border border-[#3D7A6E]/20 dark:border-[#3D7A6E]/30 bg-[#3D7A6E]/10 flex items-center justify-center gap-3 animate-pulse">
            <div className="w-5 h-5 border-2 border-[#3D7A6E] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-[#3D7A6E] dark:text-[#4A9384]">
              Finalizing post & fetching metadata...
            </span>
          </div>
        )}
        {assets.map(
          (asset) =>
            asset.status === 'uploading' && (
              <div
                key={asset.id}
                className="mx-4 p-3 rounded-xl border border-gray-100 dark:border-white/[0.08] bg-gray-50/50 dark:bg-black/20 backdrop-blur-sm"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    Uploading {asset.name}
                  </span>
                  <span className="text-[10px] font-bold text-[#3D7A6E]">
                    {asset.progress || 0}%
                  </span>
                </div>
                <div className="relative w-full h-1.5 bg-gray-200 dark:bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-[#3D7A6E] transition-all duration-300 rounded-full"
                    style={{ width: `${asset.progress || 0}%` }}
                  />
                </div>
              </div>
            )
        )}
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