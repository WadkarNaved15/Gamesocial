import React, { useState, useRef, ChangeEvent } from 'react';
import { X, Image as ImageIcon, Upload, Palette, ArrowLeft , ZoomIn } from 'lucide-react';
import '@google/model-viewer';
import type { AdModelPostFormProps, AdAsset } from "../../../types/Post";
import { useUser } from "../../../context/user";
import ImageRegionSelector, { CropRegion } from './Imageregionselector';
import AdModelPostPreview from "../../../components/ads/AdModelPostPreview";
import { MentionTextarea } from './MentionTextarea';
const PRESET_COLORS = [
  '#3D7A6E', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#14b8a6', '#ef4444', '#6366f1',
];

const hexToRgb = (hex: string): string | null => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}` : null;
};

const AdModelPostForm: React.FC<AdModelPostFormProps> = ({ onCancel, onBack }) => {
  const { user } = useUser();
  const [description, setDescription] = useState('');
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [asset, setAsset] = useState<AdAsset | null>(null);
  const [bgColor, setBgColor] = useState('transparent');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const brandName = user?.username || "Guest";
  const logoImage = user?.avatar || "/default_avatar.png";
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);
  const [bgImagePosition, setBgImagePosition] = useState<string>('50% 50%');
  const [bgImageSize, setBgImageSize] = useState<string>('cover');
  const [bgFocal, setBgFocal] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [bgZoom, setBgZoom] = useState<number>(1);
  const [bgMode, setBgMode] = useState<'color' | 'image'>('color');
  const [overlayOpacity, setOverlayOpacity] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [ctaColor, setCtaColor] = useState('#3D7A6E'); // Default green branding accent
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] =
    useState<'model' | 'brand' | 'background' | 'cta'>('model');
  const modelInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const isTransparent = bgMode === 'color' && bgColor === 'transparent';
  const isImage = bgMode === 'image' && !!bgImage;
  const accentRgb = !isTransparent && bgMode === 'color' ? hexToRgb(bgColor) : null;

  // ── File handlers ─────────────────────────────────────────────────────────
  const handleModelFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.glb')) return;
    setAsset({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), name: file.name, status: 'pending' ,fieldOfView: '25deg'});
    e.target.value = '';
  };

  const handleZoomChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (asset) {
      setAsset({ ...asset, fieldOfView: `${e.target.value}deg` });
    }
  };

  const handleBgImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgImageFile(file);
    setBgImage(URL.createObjectURL(file));
    setBgMode('image');
    setBgFocal({ x: 0.5, y: 0.5 });
    setBgImagePosition('50% 50%');
    setBgImageSize('cover');
    setBgZoom(1);
    e.target.value = '';
  };

  const handleRegionChange = (region: CropRegion) => {
    setBgImagePosition(region.backgroundPosition);
    setBgImageSize(region.backgroundSize);
    setBgFocal({ x: region.focalX, y: region.focalY });
    setBgZoom(region.zoom);
  };

  // ── S3 upload ─────────────────────────────────────────────────────────────
  const uploadToS3 = async (file: File, category: string, onProgress?: (p: number) => void): Promise<{ fileUrl: string; key: string }> => {
    const res = await fetch(`${BACKEND_URL}/api/upload/presigned-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type || 'model/gltf-binary',
        category,
        fileSize: file.size,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to get upload URL');
    }
    const { uploadUrl, key } = await res.json();
    const fileUrl = `${import.meta.env.VITE_GAMES_STORAGE_PRIVATE_CLOUDFRONT}/${key}`;
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'model/gltf-binary');
      xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) onProgress?.(Math.round((ev.loaded / ev.total) * 100)); };
      xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error('Upload failed')));
      xhr.onerror = () => reject(new Error('Upload error'));
      xhr.send(file);
    });
    return { fileUrl, key };
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!asset || isSubmitting) return;
    setIsSubmitting(true);
    let modelKey: string | undefined;
    try {
      setAsset((prev) => prev ? { ...prev, status: 'uploading', progress: 0 } : prev);
      const { fileUrl: modelUrl, key: mKey } = await uploadToS3(asset.file, 'original', (p) => {
        setAsset((prev) => prev ? { ...prev, progress: p } : prev);
      });
      modelKey = mKey;
      setAsset((prev) => prev ? { ...prev, status: 'done', progress: 100, uploadedUrl: modelUrl, originalKey: mKey , fieldOfView: asset.fieldOfView || "25deg"} : prev);

      let bgImageUrl: string | undefined;
      if (bgMode === 'image' && bgImageFile) {
        const { fileUrl } = await uploadToS3(bgImageFile, 'media');
        bgImageUrl = fileUrl;
      }

      let logoUrl: string | undefined;

      setIsSavingMetadata(true);
      const response = await fetch(`${BACKEND_URL}/api/allposts`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ad_model_post', description,
          adModelPost: {
            brandName: user?.username,
            bgMode,
            overlayOpacity,
            bgColor: bgMode === 'color' ? bgColor : undefined,
            bgImageUrl: bgMode === 'image' ? bgImageUrl : undefined,
            bgImagePosition: bgMode === 'image' ? bgImagePosition : undefined,
            bgImageSize: bgMode === 'image' ? bgImageSize : undefined,
            logoUrl: user?.avatar,
            asset: { name: asset.name, originalUrl: modelUrl, originalKey: mKey , fieldOfView: asset.fieldOfView || "25deg"},
            ctaText: ctaText || undefined,
            ctaLink: ctaLink || undefined,
            style: {
              ctaColor: ctaText ? ctaColor : undefined,
            }
          },
        }),
      });
      if (!response.ok) throw new Error('Database save failed');
      setIsSavingMetadata(false);
      setIsSubmitting(false);
      onCancel();
    } catch (err) {
      console.error('Ad post creation failed', err);
      if (modelKey) {
        await fetch(`${BACKEND_URL}/api/upload/cleanup`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keys: [modelKey] }),
        });
      }
      setIsSavingMetadata(false);
      setIsSubmitting(false);
    }
  };

  // ── Preview styles ────────────────────────────────────────────────────────
  const glassOuterStyle: React.CSSProperties = isImage
    ? { position: 'relative' }
    : { background: bgColor };

  const glassCardStyle: React.CSSProperties = isImage
    ? {
      backgroundImage: `url(${bgImage})`,
      backgroundSize: bgImageSize,
      backgroundPosition: bgImagePosition,
      backgroundRepeat: 'no-repeat',
      border: '1px solid rgba(255,255,255,0.18)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
    }
    : {
      background: `rgba(0,0,0,${overlayOpacity / 100})`,
      border: `1px solid rgba(${accentRgb},0.3)`,
      boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)`,
    };

  const glassPillStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.22)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.20)',
  };

  const glassAdBadgeStyle: React.CSSProperties = accentRgb
    ? { background: `rgba(${accentRgb},0.25)`, border: `1px solid rgba(${accentRgb},0.4)`, color: bgColor }
    : { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.7)' };

  const glassModelAreaStyle: React.CSSProperties = { background: 'transparent' };

  const transparentPillStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.06)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  };

  const getContrastText = (hex: string) => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);

    return luminance > 186 ? "#000000" : "#ffffff";
  };
  const CHARACTER_LIMIT = 150;
  const isLongText = description.length > CHARACTER_LIMIT;

  const displayedText = isLongText && !isExpanded
    ? `${description.slice(0, CHARACTER_LIMIT)}... `
    : description;
  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">

      {/* ── Form Header ─── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={18} className="text-gray-600" />
            </button>
          )}
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-tight">Ad Showcase</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">3D Model Ad</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!asset || isSubmitting}
          className="bg-[#3D7A6E] hover:bg-[#2F5E55] disabled:opacity-40 text-white font-bold px-5 py-1.5 rounded-full text-sm transition shadow-sm"
        >
          {isSubmitting ? 'Posting...' : 'Publish Ad'}
        </button>
      </div>

      {/* ── Tab Nav ─── */}
      <div className="flex border-b border-gray-100 px-4 bg-white">
        {(['model', 'brand', 'background', 'cta'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px ${activeTab === tab ? 'border-[#3D7A6E] text-[#3D7A6E]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">

        {/* ── MODEL tab ─── */}
        {activeTab === 'model' && (
          <div className="p-4 flex flex-col gap-4">
            {asset ? (
              <div>
                {/* 1. Viewer Container (Relative) */}
                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                  {/* @ts-ignore */}
                  <model-viewer src={asset.previewUrl} camera-controls auto-rotate exposure="1.2" environment-image="neutral" field-of-view={asset.fieldOfView || "25deg"} min-field-of-view="1deg" max-field-of-view="90deg" shadow-intensity="1" style={{ width: '100%', height: '360px', backgroundColor: 'transparent' }} />
                  <button onClick={() => setAsset(null)} className="absolute top-3 right-3 p-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-black/80 transition">
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider">
                    {asset.name.substring(0, 20)}{asset.name.length > 20 ? '...' : ''}
                  </div>
                </div> {/* <--- IMPORTANT: The relative container ends here! */}

                {/* 2. Zoom Slider UI (Outside the relative container) */}
                <div className="flex items-center gap-4 px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl mt-3">
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
                      value={parseInt(asset.fieldOfView || "25")}
                      onChange={handleZoomChange}
                      className="w-full accent-[#3D7A6E] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              
            ) : (
              <div onClick={() => modelInputRef.current?.click()}
                className="border-2 border-dashed border-[#3D7A6E]/30 rounded-xl py-16 flex flex-col items-center gap-3 cursor-pointer hover:bg-[#3D7A6E]/5 transition-all group">
                <div className="p-4 rounded-full bg-[#3D7A6E]/10 text-[#3D7A6E] group-hover:scale-110 transition-transform">
                  <Upload size={28} />
                </div>
                <p className="text-gray-500 font-medium text-sm">Upload one .glb model</p>
                <p className="text-gray-400 text-xs">Single model only · GLB format</p>
              </div>
            )}
            <MentionTextarea
              placeholder="Optional description or caption..."
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none text-gray-900 placeholder-gray-400 resize-none focus:ring-2 focus:ring-[#3D7A6E]/30 focus:border-[#3D7A6E] transition min-h-[80px]"
              value={description} 
              onChange={setDescription}
            />
          </div>
        )}

        {/* ── BRAND tab ─── */}
        {activeTab === 'brand' && (
          <div className="p-4 flex flex-col gap-4">

            {/* PROFILE IDENTITY (LOCKED) */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                Brand Identity (From Profile)
              </label>

              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <img
                  src={user?.avatar || "/default_avatar.png"}
                  className="w-10 h-10 rounded-full object-cover"
                />

                <span className="text-sm font-semibold text-gray-900">
                  {user?.username || "Guest"}
                </span>
              </div>
            </div>

            {/* MODEL DESCRIPTION ONLY */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                Description
              </label>

              <textarea
                placeholder="Optional caption..."
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none text-gray-900 resize-none focus:ring-2 focus:ring-[#3D7A6E]/30 focus:border-[#3D7A6E] transition min-h-[90px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

          </div>
        )}
        {/* ── CTA tab ─── */}
        {activeTab === "cta" && (
          <div className="p-4 flex flex-col gap-4">

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                CTA Button Text
              </label>
              <input
                type="text"
                placeholder="Shop Now"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#3D7A6E]/30"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                CTA Destination URL
              </label>
              <input
                type="url"
                placeholder="https://example.com"
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#3D7A6E]/30"
              />
            </div>

            {/* ⚡ NEW: CTA Color Aura Hue Selection */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                CTA Button Accent Color
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setCtaColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-9 h-9 rounded-full border-2 transition-all ${ctaColor === color ? 'border-zinc-800 scale-110 shadow-md' : 'border-transparent'
                      }`}
                  />
                ))}
                {/* Custom native color input matching presets */}
                <label className="w-9 h-9 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#3D7A6E] transition overflow-hidden relative">
                  <input
                    type="color"
                    className="opacity-0 absolute w-0 h-0"
                    value={ctaColor}
                    onChange={(e) => setCtaColor(e.target.value)}
                  />
                  <span className="text-xs text-gray-400 font-bold">+</span>
                </label>
              </div>
            </div>

          </div>
        )}

        {/* ── BACKGROUND tab ─── */}
        {activeTab === 'background' && (
          <div className="p-4 flex flex-col gap-4">
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <button onClick={() => setBgMode('color')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${bgMode === 'color' ? 'bg-white text-[#3D7A6E] shadow-sm' : 'text-gray-400'}`}>
                <Palette size={13} /> Color
              </button>
              <button onClick={() => setBgMode('image')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${bgMode === 'image' ? 'bg-white text-[#3D7A6E] shadow-sm' : 'text-gray-400'}`}>
                <ImageIcon size={13} /> Image
              </button>
            </div>

            {bgMode === 'color' && (
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Theme Color</label>
                <div className="flex flex-wrap gap-2 items-center">
                  <button onClick={() => setBgColor('transparent')} title="Transparent"
                    className={`w-9 h-9 rounded-full border-2 relative overflow-hidden transition-all ${bgColor === 'transparent' ? 'border-gray-700 scale-110 shadow-sm' : 'border-gray-300'}`}>
                    <span className="absolute inset-0" style={{ background: 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 8px 8px' }} />
                  </button>
                  {PRESET_COLORS.map((c) => (
                    <button key={c} onClick={() => setBgColor(c)} style={{ backgroundColor: c }}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${bgColor === c ? 'border-white scale-110 shadow-sm' : 'border-transparent'}`} />
                  ))}
                  <label className="w-9 h-9 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#3D7A6E] transition overflow-hidden relative">
                    <input type="color" className="opacity-0 absolute w-0 h-0" value={bgColor === 'transparent' ? '#3D7A6E' : bgColor} onChange={(e) => setBgColor(e.target.value)} />
                    <span className="text-xs text-gray-400 font-bold">+</span>
                  </label>
                </div>
                <div className="h-14 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center"
                  style={isTransparent
                    ? { background: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 14px 14px' }
                    : { background: bgColor }
                  }>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white"
                    style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
                    {isTransparent ? 'Transparent — matches normal post style' : bgColor}
                  </span>
                </div>
                {/* ── Dark overlay slider ── */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dark Overlay</label>
                    <span className="text-xs font-bold text-[#3D7A6E] tabular-nums">{overlayOpacity}%</span>
                  </div>
                  <div className="relative h-5 flex items-center">
                    {/* Styled track */}
                    <div className="absolute inset-y-0 flex items-center w-full pointer-events-none">
                      <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#3D7A6E] transition-all"
                          style={{ width: `${(overlayOpacity / 80) * 100}%` }}
                        />
                      </div>
                    </div>
                    {/* Invisible native input on top for interaction */}
                    <input
                      type="range" min={0} max={80} step={1}
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                      className="relative w-full opacity-0 cursor-pointer h-5 z-10"
                    />
                    {/* Custom thumb */}
                    <div
                      className="absolute w-4 h-4 rounded-full bg-[#3D7A6E] shadow-sm border-2 border-white pointer-events-none z-20 transition-all"
                      style={{ left: `calc(${(overlayOpacity / 80) * 100}% - ${(overlayOpacity / 80) * 16}px)` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">0% = exact original colour · 80% = darkest</p>
                </div>
              </div>
            )}

            {bgMode === 'image' && (
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Background Image</label>
                {bgImage ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400 truncate max-w-[180px]">{bgImageFile?.name}</span>
                      <button
                        onClick={() => { setBgImage(null); setBgImageFile(null); setBgMode('color'); setBgImagePosition('50% 50%'); setBgImageSize('cover'); setBgFocal({ x: 0.5, y: 0.5 }); setBgZoom(1); }}
                        className="text-xs text-red-400 hover:text-red-500 font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                    <ImageRegionSelector
                      imageSrc={bgImage}
                      onChange={handleRegionChange}
                      initialFocal={bgFocal}
                      initialZoom={bgZoom}
                    />
                  </div>
                ) : (
                  <div onClick={() => bgImageInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl py-10 flex flex-col items-center gap-2 cursor-pointer hover:bg-gray-50 transition group">
                    <div className="p-3 rounded-full bg-gray-100 text-gray-400 group-hover:scale-110 transition-transform"><ImageIcon size={22} /></div>
                    <p className="text-xs text-gray-400 font-medium">Upload background image</p>
                  </div>
                )}

                {/* ── Dark overlay slider ── */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dark Overlay</label>
                    <span className="text-xs font-bold text-[#3D7A6E] tabular-nums">{overlayOpacity}%</span>
                  </div>
                  <div className="relative h-5 flex items-center">
                    {/* Styled track */}
                    <div className="absolute inset-y-0 flex items-center w-full pointer-events-none">
                      <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#3D7A6E] transition-all"
                          style={{ width: `${(overlayOpacity / 80) * 100}%` }}
                        />
                      </div>
                    </div>
                    {/* Invisible native input on top for interaction */}
                    <input
                      type="range" min={0} max={80} step={1}
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                      className="relative w-full opacity-0 cursor-pointer h-5 z-10"
                    />
                    {/* Custom thumb */}
                    <div
                      className="absolute w-4 h-4 rounded-full bg-[#3D7A6E] shadow-sm border-2 border-white pointer-events-none z-20 transition-all"
                      style={{ left: `calc(${(overlayOpacity / 80) * 100}% - ${(overlayOpacity / 80) * 16}px)` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">0% = exact original colour · 80% = darkest</p>
                </div>
              </div>
            )}
          </div>
        )}
        {/* ── LIVE PREVIEW ── */}
        <AdModelPostPreview
          asset={asset}
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
        />


        {asset?.status === 'uploading' && (
          <div className="mx-4 mb-4 p-3 rounded-xl border border-[#3D7A6E]/20 bg-[#3D7A6E]/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-[#3D7A6E] truncate">Uploading {asset.name}</span>
              <span className="text-[10px] font-bold text-[#3D7A6E]">{asset.progress ?? 0}%</span>
            </div>
            <div className="h-1.5 bg-[#3D7A6E]/20 rounded-full overflow-hidden">
              <div className="h-full bg-[#3D7A6E] rounded-full transition-all duration-300" style={{ width: `${asset.progress ?? 0}%` }} />
            </div>
          </div>
        )}

        {isSavingMetadata && (
          <div className="mx-4 mb-4 p-3 rounded-xl border border-[#3D7A6E]/20 bg-[#3D7A6E]/10 flex items-center gap-2 animate-pulse">
            <div className="w-4 h-4 border-2 border-[#3D7A6E] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-[#3D7A6E]">Finalizing ad post...</span>
          </div>
        )}
      </div>

      <input ref={modelInputRef} type="file" accept=".glb" className="hidden" onChange={handleModelFile} />
      <input ref={bgImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgImage} />
    </div>
  );
};

export default AdModelPostForm;