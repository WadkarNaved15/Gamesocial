import React, { useState, useRef, ChangeEvent } from 'react';
import { 
  X, Upload, FileArchive, Laptop, Cpu, Database, 
  Info, Video, StopCircle, ArrowLeft, Gamepad2, Users, Image as ImageIcon 
} from 'lucide-react';
import { useUser } from "../../../context/user"; 

interface PostModalProps {
  onCancel: () => void;
  onBack?: () => void;
}

interface GameAsset {
  id: string;
  file: File;
  uploadedUrl?: string;
  name: string;
  size: number;
  progress?: number;
  status?: 'pending' | 'uploading' | 'done' | 'error' | 'cancelled';
}

interface VideoUploadState {
  file: File;
  preview: string;
  progress?: number;
  status?: 'pending' | 'uploading' | 'done' | 'error' | 'cancelled';
}

const GamePostForm: React.FC<PostModalProps> = ({ onCancel, onBack }) => {
  const { user } = useUser();
  const brandName = user?.username || "Guest";
  const logoImage = user?.avatar || "/default_avatar.png";

  /* ---------------- Core State ---------------- */
  const [activeTab, setActiveTab] = useState<'details' | 'config'>('details');
  const [gameName, setGameName] = useState('');
  const [description, setDescription] = useState('');
  const [videoUpload, setVideoUpload] = useState<VideoUploadState | null>(null);

  /* -------- Build & System Config -------- */
  const [asset, setAsset] = useState<GameAsset | null>(null);
  const [version, setVersion] = useState('1.0.0');
  const [platform, setPlatform] = useState<'windows' | 'linux'>('windows');
  type BuildType = 'archive' | 'executable';
  const [buildType, setBuildType] = useState<BuildType>('archive');
  const [startPath, setStartPath] = useState('');
  const [engine, setEngine] = useState('');
  const [ramGB, setRamGB] = useState('');
  const [cpuCores, setCpuCores] = useState('');
  const [requiresGPU, setRequiresGPU] = useState(false);

  /* -------- Upload State -------- */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const gameAbortRef = useRef<AbortController | null>(null);
  const videoXhrRef = useRef<XMLHttpRequest | null>(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const ALLOWED_EXTENSIONS = ['7z', 'zip', 'exe'];
  const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'];

  function isValidBuildFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ext && ALLOWED_EXTENSIONS.includes(ext);
  }
  function isValidVideoFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ext && ALLOWED_VIDEO_EXTENSIONS.includes(ext);
  }
  function getBuildFormat(fileName: string): '7z' | 'zip' | 'exe' {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === '7z') return '7z';
    if (ext === 'zip') return 'zip';
    return 'exe';
  }
  function buildTypeFromFile(file: File): BuildType {
    return file.name.toLowerCase().endsWith('.exe') ? 'executable' : 'archive';
  }

  /* ---------------- File Select ---------------- */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isValidBuildFile(file)) {
      setErrorMessage('Invalid build format. Only .7z, .zip, or .exe are allowed.');
      return;
    }
    setAsset({ id: crypto.randomUUID(), file, name: file.name, size: file.size, status: 'pending' });
    setBuildType(buildTypeFromFile(file));
    e.target.value = '';
  };

  const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isValidVideoFile(file)) {
      setErrorMessage('Invalid video format. Only .mp4, .webm, or .mov are allowed.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('Video is too large. Maximum allowed size is 50MB.');
      return;
    }
    if (videoUpload?.preview) URL.revokeObjectURL(videoUpload.preview);
    setVideoUpload({ file, preview: URL.createObjectURL(file), status: 'pending' });
    e.target.value = '';
  };

  const handleRemoveVideo = () => {
    if (videoUpload?.preview) URL.revokeObjectURL(videoUpload.preview);
    setVideoUpload(null);
  };

  /* ---------------- Cancel Handlers ---------------- */
  const handleCancelUpload = () => {
    if (gameAbortRef.current) {
      gameAbortRef.current.abort();
      gameAbortRef.current = null;
    }
    if (videoXhrRef.current) {
      videoXhrRef.current.abort();
      videoXhrRef.current = null;
    }
    setAsset(prev => prev ? { ...prev, status: 'cancelled', progress: 0 } : prev);
    setVideoUpload(prev => prev ? { ...prev, status: 'cancelled', progress: 0 } : prev);
    setIsSubmitting(false);
    setIsSavingMetadata(false);
    setErrorMessage('Upload cancelled.');
  };

  /* ---------------- Upload: Game Build (multipart) ---------------- */
  const CHUNK_SIZE = 10 * 1024 * 1024;

  const uploadGameToS3 = async (
    asset: GameAsset,
    onProgress: (p: number) => void,
    signal: AbortSignal
  ): Promise<{ fileUrl: string; key: string }> => {
    const startRes = await fetch(`${BACKEND_URL}/api/upload/game/start-multipart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: asset.file.name, fileType: asset.file.type }),
      signal,
    });
    if (!startRes.ok) throw new Error('Failed to initiate upload');
    const { uploadId, key } = await startRes.json();

    const totalChunks = Math.ceil(asset.file.size / CHUNK_SIZE);
    const uploadedParts: { ETag: string; PartNumber: number }[] = [];

    for (let i = 0; i < totalChunks; i++) {
      if (signal.aborted) throw new DOMException('Upload cancelled', 'AbortError');
      const partNumber = i + 1;
      const chunk = asset.file.slice(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, asset.file.size));

      const urlRes = await fetch(`${BACKEND_URL}/api/upload/game/get-part-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, key, partNumber }),
        signal,
      });
      const { uploadUrl } = await urlRes.json();

      const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: chunk, signal });
      if (!uploadRes.ok) throw new Error(`Chunk ${partNumber} upload failed`);

      const etag = uploadRes.headers.get('ETag');
      if (!etag) throw new Error('Missing ETag from S3');

      uploadedParts.push({ ETag: etag.replace(/"/g, ''), PartNumber: partNumber });
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }

    const completeRes = await fetch(`${BACKEND_URL}/api/upload/game/complete-multipart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId, key, parts: uploadedParts }),
      signal,
    });
    if (!completeRes.ok) throw new Error('Failed to complete multipart upload');

    const { fileUrl, key: uploadedKey } = await completeRes.json();
    return { fileUrl, key: uploadedKey };
  };

  /* ---------------- Upload: Video Demo (presigned PUT) ---------------- */
  const uploadVideoDemoToS3 = async (
    file: File,
    onProgress: (percent: number) => void
  ): Promise<{ fileUrl: string; key: string }> => {
    const res = await fetch(`${BACKEND_URL}/api/upload/presigned-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        category: 'media',   
        subcategory: 'game', 
        fileSize: file.size,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || 'Failed to get video upload URL');
    }

    const { uploadUrl, fileUrl, key } = await res.json();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      videoXhrRef.current = xhr;

      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        videoXhrRef.current = null;
        if (xhr.status === 200) {
          resolve({ fileUrl, key });
        } else {
          reject(new Error(`Video upload failed (HTTP ${xhr.status})`));
        }
      };
      xhr.onerror = () => {
        videoXhrRef.current = null;
        reject(new Error('Network error during video upload'));
      };
      xhr.onabort = () => {
        videoXhrRef.current = null;
        reject(new DOMException('Video upload cancelled', 'AbortError'));
      };

      xhr.send(file);
    });
  };

  /* ---------------- Derived state ---------------- */
  const isUploading = asset?.status === 'uploading' || videoUpload?.status === 'uploading';

  /* ---------------- Submit ---------------- */
  const handlePostSubmit = async () => {
    if (!asset || !gameName || !startPath || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setIsSavingMetadata(false);

    const abortController = new AbortController();
    gameAbortRef.current = abortController;

    try {
      /* 1. Game build */
      setAsset(prev => prev ? { ...prev, status: 'uploading', progress: 0 } : prev);
      const { fileUrl, key } = await uploadGameToS3(
        asset,
        p => setAsset(prev => prev ? { ...prev, progress: p } : prev),
        abortController.signal
      );
      setAsset(prev => prev ? { ...prev, uploadedUrl: fileUrl, status: 'done' } : prev);
      gameAbortRef.current = null;

      /* 2. Video demo (optional) */
      let videoDemoData = null;
      if (videoUpload) {
        setVideoUpload(prev => prev ? { ...prev, status: 'uploading', progress: 0 } : prev);
        const uploaded = await uploadVideoDemoToS3(
          videoUpload.file,
          p => setVideoUpload(prev => prev ? { ...prev, progress: p } : prev)
        );
        setVideoUpload(prev => prev ? { ...prev, status: 'done' } : prev);
        videoDemoData = {
          name: videoUpload.file.name,
          size: videoUpload.file.size,
          key: uploaded.key,
          url: uploaded.fileUrl,
        };
      }

      /* 3. Save metadata */
      setIsSavingMetadata(true);
      const response = await fetch(`${BACKEND_URL}/api/allposts`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'game_post',
          description,
          game: {
            gameName,
            version,
            platform,
            buildType,
            startPath,
            engine,
            runMode: 'sandboxed',
            systemRequirements: {
              ramGB: ramGB ? Number(ramGB) : null,
              cpuCores: cpuCores ? Number(cpuCores) : null,
              gpuRequired: requiresGPU,
            },
            file: {
              name: asset.name,
              key,
              url: fileUrl,
              size: asset.size,
              format: getBuildFormat(asset.name),
            },
            videoDemo: videoDemoData,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to save post');

      onCancel();
    } catch (err: any) {
      if (err.name === 'AbortError') return; 
      console.error('Submission error:', err);
      setErrorMessage(err.message);
      setIsSubmitting(false);
      setIsSavingMetadata(false);
      setAsset(prev => prev ? { ...prev, status: 'error' } : prev);
      setVideoUpload(prev => prev ? { ...prev, status: 'error' } : prev);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-[#191919] min-h-[75vh] max-h-[90vh] rounded-2xl border border-gray-200 dark:border-zinc-800 flex flex-col overflow-hidden shadow-sm">
      
      {/* ── Sticky Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800 bg-white/80 dark:bg-[#191919]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <ArrowLeft size={18} className="text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-black dark:text-white leading-tight">Publish Game</h2>
          </div>
        </div>
        <button
          onClick={handlePostSubmit}
          disabled={!asset || !startPath || !gameName || isSubmitting}
          className="bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white font-bold px-5 py-1.5 rounded-full text-sm transition shadow-sm"
        >
          {isSubmitting ? 'Publishing...' : 'Post Game'}
        </button>
      </div>

      {/* Universal Error Banner */}
      {errorMessage && (
        <div className="mx-4 mt-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center justify-between shrink-0">
          <span className="flex items-center gap-2"><Info size={16} />{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}><X size={18} /></button>
        </div>
      )}

      {/* ── Tab Nav ── */}
      <div className="flex border-b border-gray-100 dark:border-zinc-800 px-4 bg-white dark:bg-[#191919] shrink-0">
        {(['details', 'config'] as const).map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              activeTab === tab ? 'border-sky-500 text-sky-500' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            {tab === 'details' ? 'Details & Media' : 'Build & Deployment'}
          </button>
        ))}
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">

        {/* ── TAB 1: Details & Media ── */}
        {activeTab === 'details' && (
          <div className="flex flex-1 p-4 gap-4">
            
            {/* User Avatar Column */}
            <div className="flex-shrink-0">
              <img 
                src={logoImage} 
                alt={brandName} 
                className="h-12 w-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800" 
              />
            </div>

            {/* Content Column */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              
              {/* Inputs Section */}
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Game Title"
                  className="w-full text-2xl font-bold bg-transparent border-none outline-none text-black dark:text-white placeholder-gray-500 focus:ring-0 p-0"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                />
                <textarea
                  placeholder="What's special about your game?"
                  className="w-full text-lg bg-transparent border-none outline-none text-black dark:text-white placeholder-gray-500 resize-none focus:ring-0 min-h-[90px] p-0 mt-2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Asset Management UI - Video Trailer */}
              <div className="flex flex-col gap-3">
                {videoUpload ? (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 group">
                    <video 
                      src={videoUpload.preview} 
                      controls 
                      className="w-full h-[300px] object-contain bg-black" 
                    />
                    <div className="absolute top-4 right-4 pointer-events-none bg-[#191919]/60 backdrop-blur-sm px-3 py-1 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider">
                      Previewing: {videoUpload.file.name.substring(0, 15)}{videoUpload.file.name.length > 15 ? '...' : ''}
                    </div>
                    {!isSubmitting && (
                      <button 
                        type="button" 
                        onClick={handleRemoveVideo} 
                        className="absolute top-4 left-4 p-2 bg-[#191919]/60 hover:bg-[#191919]/80 backdrop-blur-sm rounded-full transition-colors text-white"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl py-16 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900/30 transition-all group"
                  >
                    <div className="p-3 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-500 group-hover:scale-110 transition-transform">
                      <Video size={32} />
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 font-medium">Upload Gameplay Trailer</p>
                      <p className="text-[10px] text-gray-400 mt-1">.mp4, .webm, .mov (Max 50MB)</p>
                    </div>
                  </div>
                )}
                <input ref={videoInputRef} type="file" hidden accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoChange} />
              </div>

              {/* Live Post Preview Element */}
              <div className="pt-4 mt-2 border-t border-gray-100 dark:border-zinc-800">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-3">Post Preview</p>
                
                <article className="relative w-full border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-[#191919] pointer-events-none">
                  <div className="flex gap-3 p-4">
                    <img src={logoImage} alt={brandName} className="h-10 w-10 rounded-full object-cover mt-1 border border-gray-100 dark:border-zinc-800" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-black dark:text-white">{brandName}</span>
                        <span className="text-xs text-gray-500">Just now</span>
                      </div>
                      {description && (
                        <div className="mt-2 mb-3">
                          <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap line-clamp-2">
                            {description}
                          </p>
                        </div>
                      )}
                      <div className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
                        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-purple-500/10 opacity-50" />
                        <div className="relative w-full h-[200px] overflow-hidden">
                          {videoUpload?.preview ? (
                            <>
                              <video src={videoUpload.preview} muted className="absolute inset-0 w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 opacity-30 gap-2">
                              <Gamepad2 size={24} />
                              <span className="text-[10px] font-bold uppercase tracking-widest">No Video Uploaded</span>
                            </div>
                          )}
                          <div className="absolute top-4 left-4 z-40 flex items-center gap-3">
                            <h3 className="text-lg font-black text-white tracking-tight leading-none drop-shadow-md">
                              {gameName || "Game Title"}
                            </h3>
                            <div className="text-white px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg" style={{ background: "linear-gradient(to bottom right, #3D7A6E, #000000)" }}>
                              <Users size={10} />
                              <span className="font-semibold text-[10px]">Play Now</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </div>

            </div>
          </div>
        )}

        {/* ── TAB 2: Build & Deployment Config ── */}
        {activeTab === 'config' && (
          <div className="p-4 flex flex-col gap-6">
            
            {/* Build Upload */}
            <section className="space-y-3">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Game Build File</label>
              {asset ? (
                <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-sky-200 dark:border-sky-900/30">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-lg">
                      <FileArchive size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-black dark:text-white truncate">{asset.name}</p>
                      <p className="text-[10px] text-gray-500 font-bold">{(asset.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    {!isSubmitting && (
                      <button onClick={() => setAsset(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X size={16} className="text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl py-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900/30 transition-all group"
                >
                  <div className="p-4 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-500 group-hover:scale-110 transition-transform">
                    <Upload size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-gray-900 dark:text-white font-bold text-sm">Upload Game Build</p>
                    <p className="text-[10px] text-gray-500 mt-1">.zip, .7z, .exe</p>
                  </div>
                </div>
              )}
              <input ref={fileInputRef} type="file" hidden accept=".7z,.zip,.exe,application/x-7z-compressed,application/zip" onChange={handleFileChange} />
            </section>

            {/* Core Configs */}
            <section className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Target Platform</label>
                  <select
                    value={platform}
                    onChange={e => setPlatform(e.target.value as 'windows' | 'linux')}
                    className="w-full bg-gray-50 dark:bg-zinc-900 text-black dark:text-white p-2.5 text-sm rounded-xl border border-gray-200 dark:border-zinc-800 outline-none cursor-pointer"
                  >
                    <option value="windows">Windows</option>
                    <option value="linux">Linux</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Build Type</label>
                  <select
                    value={buildType}
                    onChange={e => setBuildType(e.target.value as BuildType)}
                    className="w-full bg-gray-50 dark:bg-zinc-900 text-black dark:text-white p-2.5 text-sm rounded-xl border border-gray-200 dark:border-zinc-800 outline-none cursor-pointer"
                  >
                    <option value="archive">Archive (.zip / .7z)</option>
                    <option value="executable">Executable (.exe)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-sky-500 uppercase tracking-wider pl-1 flex items-center gap-1">
                  <Laptop size={12} /> Start Path (Required)
                </label>
                <input
                  placeholder="e.g. MyGame_Build/Game.exe"
                  value={startPath}
                  onChange={e => setStartPath(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-900 text-black dark:text-white p-3 rounded-xl border border-sky-500/50 focus:ring-2 focus:ring-sky-500 outline-none transition-all font-mono text-sm"
                />
                
                {/* Helpful Instruction Box */}
                <div className="px-3 py-2 bg-sky-50/50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-900/30 rounded-lg mt-1 space-y-1">
                  <p className="text-[10px] text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                    Enter the path exactly as it is structured <strong className="text-sky-600 dark:text-sky-400">inside</strong> your archive. <strong className="text-sky-600 dark:text-sky-400">Do not start with a /</strong>
                  </p>
                  
                  <div className="text-[10px] text-gray-500 dark:text-zinc-500 leading-relaxed mt-1.5 space-y-2">
                    <p>
                      <span className="font-bold text-gray-600 dark:text-zinc-400">Scenario A:</span> If your zip contains a folder named <code className="bg-white dark:bg-zinc-800 px-1 py-0.5 rounded border border-gray-200 dark:border-zinc-700">MyGame_Build</code>, and the exe is inside it:
                      <span className="block mt-1 text-sky-600 dark:text-sky-400 font-mono font-bold bg-sky-100 dark:bg-sky-900/30 w-fit px-2 py-0.5 rounded">
                        MyGame_Build/Game.exe
                      </span>
                    </p>
                    <p>
                      <span className="font-bold text-gray-600 dark:text-zinc-400">Scenario B:</span> If the exe is right at the root of the zip (not inside any folders):
                      <span className="block mt-1 text-sky-600 dark:text-sky-400 font-mono font-bold bg-sky-100 dark:bg-sky-900/30 w-fit px-2 py-0.5 rounded">
                        Game.exe
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="Version (1.0.0)"
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                  className="w-full text-sm bg-gray-50 dark:bg-zinc-900 text-black dark:text-white p-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 outline-none"
                />
                <input
                  placeholder="Engine (Unity, Unreal...)"
                  value={engine}
                  onChange={e => setEngine(e.target.value)}
                  className="w-full text-sm bg-gray-50 dark:bg-zinc-900 text-black dark:text-white p-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 outline-none"
                />
              </div>
            </section>

            {/* System Requirements */}
            <section className="p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-xl border border-gray-100 dark:border-zinc-800 space-y-4 mt-2">
              <div className="flex items-center gap-2 text-gray-700 dark:text-zinc-300 font-bold text-sm">
                <Cpu size={16} /><span>System Requirements</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number" min={1} placeholder="RAM (GB)" value={ramGB}
                  onChange={e => setRamGB(e.target.value)}
                  className="text-sm bg-white dark:bg-zinc-900 text-black dark:text-white p-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 outline-none"
                />
                <input
                  type="number" min={1} placeholder="CPU Cores" value={cpuCores}
                  onChange={e => setCpuCores(e.target.value)}
                  className="text-sm bg-white dark:bg-zinc-900 text-black dark:text-white p-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 outline-none"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer group w-fit pt-1">
                <input
                  type="checkbox"
                  checked={requiresGPU}
                  onChange={e => setRequiresGPU(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-zinc-700 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-xs font-semibold text-gray-600 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                  Dedicated GPU Required
                </span>
              </label>
            </section>
          </div>
        )}
      </div>

      {/* ── Universal Progress & Footer Tools ── */}
      <div className="border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#191919] flex flex-col shrink-0">
        
        {/* Upload Status Area */}
        {(isUploading || isSavingMetadata) && (
          <div className="px-6 py-4 bg-sky-50 dark:bg-sky-900/10 border-b border-sky-100 dark:border-sky-900/20 space-y-3">
            {isUploading && (
              <div className="flex justify-end">
                <button
                  onClick={handleCancelUpload}
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-red-500 hover:text-red-600 transition-colors"
                >
                  <StopCircle size={13} /> Cancel Upload
                </button>
              </div>
            )}

            {isSavingMetadata && !isUploading && (
              <p className="text-xs text-sky-600 dark:text-sky-400 font-semibold animate-pulse text-center">
                Finalizing game metadata and permissions...
              </p>
            )}

            {asset?.status === 'uploading' && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                  <span className="text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                    <FileArchive size={12} /> Uploading Game Build
                  </span>
                  <span className="text-sky-600 dark:text-sky-400">{asset.progress ?? 0}%</span>
                </div>
                <div className="h-2 bg-sky-100 dark:bg-sky-900/40 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 transition-all duration-300 ease-out" style={{ width: `${asset.progress ?? 0}%` }} />
                </div>
              </div>
            )}

            {videoUpload?.status === 'uploading' && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                  <span className="text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                    <Video size={12} /> Uploading Video Trailer
                  </span>
                  <span className="text-sky-600 dark:text-sky-400">{videoUpload.progress ?? 0}%</span>
                </div>
                <div className="h-2 bg-sky-100 dark:bg-sky-900/40 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 transition-all duration-300 ease-out" style={{ width: `${videoUpload.progress ?? 0}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form Footer Tools */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="text-xs font-bold text-gray-400 dark:text-gray-600">
            {asset ? '1' : '0'} / 1 Build • {videoUpload ? '1' : '0'} / 1 Media
          </div>
        </div>
      </div>

    </div>
  );
};

export default GamePostForm;