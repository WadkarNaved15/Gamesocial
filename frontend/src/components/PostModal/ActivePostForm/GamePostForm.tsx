import React, { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';
import axios from 'axios';
import api from '../../../utils/api';
import {
  X, Upload, FileArchive, Info, Video, StopCircle,
  ArrowLeft, Gamepad2, Users, CreditCard, Zap,
  CheckCircle2, Loader2, AlertTriangle,
} from 'lucide-react';
import { useUser } from "../../../context/user";

interface PostModalProps {
  onCancel: () => void;
  onBack?: () => void;
}

interface GameAsset {
  id: string;
  file: File | null;
  uploadedUrl?: string;
  uploadedKey?: string;
  name: string;
  size: number;
  progress?: number;
  status?: 'pending' | 'uploading' | 'done' | 'error' | 'cancelled';
}

interface VideoUploadState {
  file: File | null;
  preview: string;
  progress?: number;
  status?: 'pending' | 'uploading' | 'done' | 'error' | 'cancelled'; // S3 Upload status
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed'; // FFmpeg Worker status
}

type DraftStatus =
  | 'draft' | 'uploading' | 'ready_for_payment'
  | 'payment_pending' | 'payment_completed'
  | 'publishing' | 'published' | 'failed';

const CREDITS_PER_SESSION = 10;
const CHUNK_SIZE = 10 * 1024 * 1024;
const ALLOWED_BUILD_EXTENSIONS = ['7z', 'zip', 'exe'];
const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'];
const POLL_INTERVAL_MS = 2500;

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpay = () =>
  new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    document.body.appendChild(script);
  });

const GamePostForm: React.FC<PostModalProps> = ({ onCancel, onBack }) => {
  const { user } = useUser();
  const brandName = user?.username || 'Guest';
  const logoImage = user?.avatar || '/default_avatar.png';

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'details' | 'build' | 'payment'>('details');

  // ── Details ───────────────────────────────────────────────────────────────
  const [gameName, setGameName] = useState('');
  const [description, setDescription] = useState('');

  // ── Build ─────────────────────────────────────────────────────────────────
  const [asset, setAsset] = useState<GameAsset | null>(null);
  const [startPath, setStartPath] = useState('');
  const [videoUpload, setVideoUpload] = useState<VideoUploadState | null>(null);

  // ── Payment ───────────────────────────────────────────────────────────────
  const [dollars, setDollars] = useState<number>(100);

  // ── Draft / pipeline state ────────────────────────────────────────────────
  const [pendingDraft, setPendingDraft] = useState<any | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('draft');
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const gameAbortRef = useRef<AbortController | null>(null);
  const videoAbortRef = useRef<AbortController | null>(null); 
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const effectiveCredits = Math.floor(dollars * 4) * 10;
  const totalDollars = effectiveCredits / 40;
  const estimatedSessions = effectiveCredits / CREDITS_PER_SESSION;

  const canProceedToBuild = gameName.trim().length > 0;
  const canProceedToPayment = canProceedToBuild && !!asset && startPath.trim().length > 0;
  const canPayAndPublish = canProceedToPayment && totalDollars >= 100 && totalDollars <= 5000;

  // ── Polling ───────────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback((id: string) => {
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/api/gamePosts/draft/${id}`);
        setDraftStatus(data.status);

        if (data.status === 'published') {
          stopPolling();
          setIsPublishing(false);
          localStorage.removeItem("activeGameDraftId");
          setPublishSuccess(true);
        } else if (data.status === 'failed') {
          stopPolling();
          setIsPublishing(false);
          setErrorMessage(data.failureReason || 'Publishing failed. Please contact support — your payment is safe.');
        }
      } catch (_) {
        // ignore transient network errors
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isValidBuildFile = (f: File) => ALLOWED_BUILD_EXTENSIONS.includes(f.name.split('.').pop()?.toLowerCase() ?? '');
  const isValidVideoFile = (f: File) => ALLOWED_VIDEO_EXTENSIONS.includes(f.name.split('.').pop()?.toLowerCase() ?? '');

  const hydrateDraft = (data: any) => {
    if (!data) return;

    setDraftId(data.draftId || data._id || null);

    if (data.draftId || data._id) {
      localStorage.setItem("activeGameDraftId", data.draftId || data._id);
    }

    setGameName(data.game?.gameName || "");
    setDescription(data.description || "");
    setStartPath(data.game?.startPath || "");
    setDraftStatus(data.status || "draft");

    if (data.selectedCredits) {
      setDollars(Math.max(100, data.selectedCredits / 40));
    }

    if (data.buildFile?.key) {
      setAsset({
        id: crypto.randomUUID(),
        file: null as any,
        name: data.buildFile.name || "",
        size: data.buildFile.size || 0,
        uploadedKey: data.buildFile.key,
        uploadedUrl: data.buildFile.url,
        progress: 100,
        status: "done",
      });
    } else {
      setAsset(null);
    }

    if (data.videoDemo?.key) {
  setVideoUpload({
    file: null as any,
    // Prefer optimized preview if available, fallback to original
    preview: data.videoDemo.optimizedUrl || data.videoDemo.url, 
    progress: 100,
    status: "done",
    processingStatus: data.videoDemo.processingStatus // Track backend FFmpeg status
  });
} else {
  setVideoUpload(null);
}

    if (data.status === "payment_completed" || data.status === "publishing") {
      setIsPublishing(true);
      startPolling(data.draftId || data._id);
    }

    if (data.status === "published") {
      localStorage.removeItem("activeGameDraftId");
      setPublishSuccess(true);
    }

    if (data.status === "failed") {
      setErrorMessage(data.failureReason || "Publishing failed.");
    }
  };

  // ── Draft check on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const checkDrafts = async () => {
      let draftData = null;
      const savedDraftId = localStorage.getItem("activeGameDraftId");

      if (savedDraftId) {
        try {
          const { data } = await api.get(`/api/gamePosts/draft/${savedDraftId}`);
          draftData = data;
        } catch {
          localStorage.removeItem("activeGameDraftId");
        }
      }

      if (!draftData) {
        try {
          const { data } = await api.get("/api/gamePosts/my-active-draft");
          draftData = data;
        } catch {
          // No active drafts
        }
      }

      if (draftData) {
        const autoHydrateStatuses = ['publishing', 'published', 'failed', 'payment_completed'];
        
        if (autoHydrateStatuses.includes(draftData.status)) {
          hydrateDraft(draftData);
        } else {
          setPendingDraft(draftData);
        }
      }
    };

    checkDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Draft persistence ─────────────────────────────────────────────────────
  const saveDraftMeta = async (): Promise<string> => {
    setIsSavingDraft(true);
    const payload = {
      draftId,
      description,
      game: { gameName, startPath, platform: 'windows' },
    };
    
    try {
      const { data } = await api.post('/api/gamePosts/draft', payload);
      setDraftId(data.draftId);
      localStorage.setItem("activeGameDraftId", data.draftId);
      return data.draftId;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // ── File handlers ─────────────────────────────────────────────────────────
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isValidBuildFile(file)) {
      setErrorMessage('Invalid build format. Only .7z, .zip, or .exe are allowed.');
      return;
    }
    setErrorMessage(null);
    setAsset({ id: crypto.randomUUID(), file, name: file.name, size: file.size, status: 'pending' });
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
      setErrorMessage('Video is too large. Maximum allowed size is 50 MB.');
      return;
    }
    setErrorMessage(null);
    if (videoUpload?.preview) URL.revokeObjectURL(videoUpload.preview);
    setVideoUpload({ file, preview: URL.createObjectURL(file), status: 'pending' });
    e.target.value = '';
  };

  const handleRemoveVideo = () => {
    if (videoUpload?.preview) URL.revokeObjectURL(videoUpload.preview);
    setVideoUpload(null);
  };

  const handleCancelUpload = () => {
    gameAbortRef.current?.abort();
    gameAbortRef.current = null;
    videoAbortRef.current?.abort();
    videoAbortRef.current = null;
    
    setAsset(prev => prev ? { ...prev, status: 'cancelled', progress: 0 } : prev);
    setVideoUpload(prev => prev ? { ...prev, status: 'cancelled', progress: 0 } : prev);
    setIsUploading(false);
    setErrorMessage('Upload cancelled.');
  };

  // ── S3 Uploads ────────────────────────────────────────────────────────────
  const uploadGameToS3 = async (
    a: GameAsset,
    onProgress: (p: number) => void,
    signal: AbortSignal,
  ): Promise<{ fileUrl: string; key: string }> => {

    if (!a.file) {
      throw new Error(
        "Original build file is no longer available. Please re-upload the build."
      );
    }

    const file = a.file;

    const { data: startData } = await api.post(
      "/api/upload/game/start-multipart",
      {
        fileName: file.name,
        fileType: file.type,
      },
      { signal }
    );

    const { uploadId, key } = startData;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const parts: { ETag: string; PartNumber: number }[] = [];

    for (let i = 0; i < totalChunks; i++) {
      if (signal.aborted) {
        throw new DOMException("Upload cancelled", "AbortError");
      }

      const partNumber = i + 1;
      const chunk = file.slice(
        i * CHUNK_SIZE,
        Math.min((i + 1) * CHUNK_SIZE, file.size)
      );

      const { data: urlData } = await api.post(
        "/api/upload/game/get-part-url",
        {
          uploadId,
          key,
          partNumber,
        },
        { signal }
      );

      const uploadRes = await axios.put(
        urlData.uploadUrl,
        chunk,
        { signal }
      );

      const etag =
        uploadRes.headers.etag ||
        uploadRes.headers.ETag;

      if (!etag) {
        throw new Error("Missing ETag from S3");
      }

      parts.push({
        ETag: etag.replace(/"/g, ""),
        PartNumber: partNumber,
      });

      onProgress(
        Math.round(((i + 1) / totalChunks) * 100)
      );
    }

    const { data: completeData } = await api.post(
      "/api/upload/game/complete-multipart",
      {
        uploadId,
        key,
        parts,
      },
      { signal }
    );

    return completeData;
  };

  const uploadVideoDemoToS3 = async (
    file: File,
    onProgress: (p: number) => void,
  ): Promise<{ fileUrl: string; key: string }> => {
    const { data } = await api.post('/api/upload/presigned-url', {
      fileName: file.name, fileType: file.type,
      category: 'media', subcategory: 'game', fileSize: file.size,
    });

    const abortController = new AbortController();
    videoAbortRef.current = abortController;

    await axios.put(data.uploadUrl, file, {
      headers: { 'Content-Type': file.type },
      signal: abortController.signal,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          onProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
        }
      }
    });

    return { fileUrl: data.fileUrl, key: data.key };
  };

  // ── Main: Pay & Publish flow ──────────────────────────────────────────────
  const handlePayAndPublish = async () => {
    if (
      !canPayAndPublish ||
      isUploading ||
      isCreatingOrder ||
      isPublishing
    ) {
      return;
    }

    setErrorMessage(null);

    try {
      let activeDraftId = draftId;

      if (!activeDraftId) {
        activeDraftId = await saveDraftMeta();
      }

      // --------------------------------------------------
      // BUILD
      // --------------------------------------------------

      const buildAlreadyUploaded =
        asset?.uploadedKey &&
        asset?.uploadedUrl;

      if (!buildAlreadyUploaded) {
        setIsUploading(true);

        const abort = new AbortController();
        gameAbortRef.current = abort;

        setAsset(prev =>
          prev
            ? { ...prev, status: "uploading", progress: 0 }
            : prev
        );

        const { fileUrl, key } =
          await uploadGameToS3(
            asset!,
            p => setAsset(prev => prev ? { ...prev, progress: p } : prev),
            abort.signal
          );

        setAsset(prev =>
          prev
            ? { ...prev, uploadedUrl: fileUrl, uploadedKey: key, status: "done" }
            : prev
        );

        gameAbortRef.current = null;

        await api.post(
          `/api/gamePosts/draft/${activeDraftId}/build`,
          {
            name: asset!.name,
            key,
            url: fileUrl,
            size: asset!.size,
          }
        );
      }

      // --------------------------------------------------
      // VIDEO
      // --------------------------------------------------

      const videoAlreadyUploaded =
        videoUpload?.status === "done" &&
        !videoUpload.file;

      if (
        videoUpload &&
        !videoAlreadyUploaded
      ) {
        if (!videoUpload.file) {
          throw new Error(
            "Original trailer file is no longer available. Please re-upload the trailer."
          );
        }

        setVideoUpload(prev =>
          prev
            ? { ...prev, status: "uploading", progress: 0 }
            : prev
        );

        const { fileUrl, key } =
          await uploadVideoDemoToS3(
            videoUpload.file,
            p => setVideoUpload(prev => prev ? { ...prev, progress: p } : prev)
          );

        setVideoUpload(prev =>
          prev ? { ...prev, status: "done" } : prev
        );

        await api.post(
          `/api/gamePosts/draft/${activeDraftId}/video`,
          {
            name: videoUpload.file.name,
            key,
            url: fileUrl,
            size: videoUpload.file.size,
          }
        );
      }

      setIsUploading(false);

      // --------------------------------------------------
      // READY ONLY IF NOT ALREADY PAYMENT_PENDING
      // --------------------------------------------------

      if (
        draftStatus !== "payment_pending" &&
        draftStatus !== "payment_completed" &&
        draftStatus !== "publishing"
      ) {
        await api.post(`/api/gamePosts/draft/${activeDraftId}/ready`);
      }

      // --------------------------------------------------
      // ORDER
      // --------------------------------------------------

      setIsCreatingOrder(true);

      const { data: orderData } =
        await api.post(
          "/api/gamePosts/create-payment-order",
          {
            draftId: activeDraftId,
            selectedCredits: effectiveCredits,
          }
        );

      setIsCreatingOrder(false);

      // --------------------------------------------------
      // RAZORPAY
      // --------------------------------------------------

      await loadRazorpay();

      if (!window.Razorpay) {
        throw new Error("Failed to load Razorpay");
      }

      await new Promise<void>(
        (resolve, reject) => {
          const rzp =
            new window.Razorpay({
              key: orderData.keyId,
              amount: orderData.amount,
              currency: orderData.currency,
              name: "Rigzer",
              image: "/Logo.png",
              description: `${effectiveCredits} Credits — ${gameName}`,
              order_id: orderData.orderId,

              prefill: {
                name: user?.username || brandName,
                email: user?.email || "",
              },

              theme: {
                color: "#3D7A6E",
              },

              handler: async (response: any) => {
                try {
                  await api.post(
                    "/api/gamePosts/verify-payment",
                    {
                      draftId: activeDraftId,
                      razorpayOrderId: response.razorpay_order_id,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpaySignature: response.razorpay_signature,
                    }
                  );

                  setIsPublishing(true);
                  setDraftStatus("payment_completed");
                  startPolling(activeDraftId!);

                  resolve();
                } catch (err: any) {
                  reject(
                    new Error(
                      err.response?.data?.message || "Payment verification failed"
                    )
                  );
                }
              },

              modal: {
                ondismiss: () => reject(new Error("Payment cancelled")),
              },
            });

          rzp.on("payment.failed", (resp: any) => {
            reject(new Error(resp.error?.description || "Payment failed"));
          });

          rzp.open();
        }
      );
    } catch (err: any) {
      if (err.name === "AbortError" || err.name === "CanceledError") return;

      setIsUploading(false);
      setIsCreatingOrder(false);
      setIsPublishing(false);

      setErrorMessage(
        err.response?.data?.message ||
        err.message ||
        "Something went wrong. Please try again."
      );
    }
  };

  // ── UI States ─────────────────────────────────────────────────────────────

  // 1. Prompt Draft State
  if (pendingDraft) {
    return (
      // <div className="w-full max-w-2xl mx-auto bg-white dark:bg-black/20 backdrop-blur-2xl min-h-[50vh] rounded-3xl border border-gray-200 dark:border-white/[0.06] flex flex-col items-center justify-center gap-5 p-12 shadow-2xl">
      <div className="w-full max-w-2xl mx-auto bg-white/[0.03] backdrop-blur-2xl min-h-[50vh] rounded-3xl border border-gray-200 dark:border-white/[0.06] flex flex-col items-center justify-center gap-5 p-12 shadow-2xl">
        <div className="p-4 rounded-full bg-[#3D7A6E]/10 dark:bg-[#3D7A6E]/20 border border-[#3D7A6E]/20">
          <FileArchive size={36} className="text-[#3D7A6E]" />
        </div>
        <div className="text-center space-y-4">
          <h2 className="text-xl font-black text-black dark:text-white tracking-tight">Found unfinished draft</h2>
          <div className="bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.08] rounded-2xl px-6 py-4 inline-block text-left min-w-[240px]">
            <p className="text-lg font-black text-black dark:text-white mb-2">
              {pendingDraft.game?.gameName || pendingDraft.gameName || 'Untitled Project'}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status:</span>
              <span className="text-xs font-semibold text-[#3D7A6E] bg-[#3D7A6E]/10 px-2 py-1 rounded-md">
                {pendingDraft.status || 'draft'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => {
              localStorage.removeItem("activeGameDraftId");
              setPendingDraft(null);
            }}
            className="px-8 py-2.5 rounded-full text-sm font-bold bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-gray-600 dark:text-gray-300 transition"
          >
            Discard
          </button>
          <button
            onClick={() => {
              hydrateDraft(pendingDraft);
              setPendingDraft(null);
            }}
            className="bg-[#3D7A6E] hover:bg-[#2F5E55] text-white font-bold px-8 py-2.5 rounded-full text-sm transition shadow-sm"
          >
            Resume
          </button>
        </div>
      </div>
    );
  }

  // 2. Published State
  if (publishSuccess) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-gray-200 dark:border-white/[0.06] flex flex-col items-center justify-center gap-5 p-12 shadow-2xl">
        <div className="p-4 rounded-full bg-[#3D7A6E]/10 dark:bg-[#3D7A6E]/20 border border-[#3D7A6E]/20">
          <CheckCircle2 size={40} className="text-[#3D7A6E]" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black text-black dark:text-white tracking-tight">Game Published!</h2>
          <p className="text-sm text-gray-500">
            <span className="font-bold text-black dark:text-white">{gameName}</span> is now live with{' '}
            <span className="font-bold text-[#3D7A6E]">{effectiveCredits} credits</span>.
          </p>
        </div>
        <button onClick={onCancel} className="bg-[#3D7A6E] hover:bg-[#2F5E55] text-white font-bold px-8 py-2.5 rounded-full text-sm transition shadow-sm mt-2">
          Done
        </button>
      </div>
    );
  }

  const publishingStates: Record<DraftStatus, string> = {
    draft: '', uploading: 'Uploading…', ready_for_payment: '',
    payment_pending: 'Awaiting payment…', payment_completed: 'Payment received. Publishing…',
    publishing: 'Creating your game post…', published: 'Published!', failed: 'Failed',
  };

  const buttonLabel = (() => {
    if (isUploading) return 'Uploading…';
    if (isCreatingOrder) return 'Creating order…';
    if (isPublishing) return publishingStates[draftStatus] || 'Publishing…';
    return `Pay $${totalDollars.toFixed(2)} & Publish`;
  })();

  const isButtonBusy = isUploading || isCreatingOrder || isPublishing;

  // ── Render Form ───────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-2xl mx-auto bg-white/[0.03] backdrop-blur-2xl min-h-[75vh] max-h-[90vh] rounded-3xl border border-gray-200 dark:border-white/[0.06] flex flex-col overflow-hidden shadow-2xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.06] bg-transparent sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-full transition-colors">
              <ArrowLeft size={18} className="text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <h2 className="text-xl font-bold text-black dark:text-white tracking-tight leading-tight">Publish Game</h2>
        </div>

        {activeTab === 'payment' ? (
          <button
            onClick={handlePayAndPublish}
            disabled={!canPayAndPublish || isButtonBusy}
            className="bg-[#3D7A6E] hover:bg-[#2F5E55] disabled:opacity-40 text-white font-bold px-6 py-2 rounded-full text-sm transition shadow-sm flex items-center gap-2"
          >
            {isButtonBusy && <Loader2 size={14} className="animate-spin" />}
            {buttonLabel}
          </button>
        ) : (
          <button
            onClick={() => {
              if (activeTab === 'details' && canProceedToBuild) setActiveTab('build');
              else if (activeTab === 'build' && canProceedToPayment) setActiveTab('payment');
            }}
            disabled={
              (activeTab === 'details' && !canProceedToBuild) ||
              (activeTab === 'build' && !canProceedToPayment)
            }
            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white font-bold px-6 py-2 rounded-full text-sm transition shadow-sm"
          >
            Next →
          </button>
        )}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center justify-between shrink-0">
          <span className="flex items-center gap-2"><Info size={16} />{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}><X size={18} /></button>
        </div>
      )}

      {/* ── Tab Nav ── */}
      <div className="flex border-b border-gray-100 dark:border-white/[0.06] px-6 bg-transparent shrink-0">
        {(['details', 'build', 'payment'] as const).map((tab) => {
          const labels = { details: 'Details & Media', build: 'Build', payment: 'Payment' };
          const isLocked =
            (tab === 'build' && !canProceedToBuild) ||
            (tab === 'payment' && !canProceedToPayment);
          return (
            <button
              key={tab}
              onClick={() => !isLocked && setActiveTab(tab)}
              disabled={isLocked}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-[#3D7A6E] text-[#3D7A6E]'
                  : isLocked
                  ? 'border-transparent text-gray-300 dark:text-white/[0.2] cursor-not-allowed'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">

        {/* ══ TAB: Details & Media ══ */}
        {activeTab === 'details' && (
          <div className="flex flex-1 p-6 gap-5">
            <div className="flex-shrink-0">
              <img src={logoImage} alt={brandName} className="h-12 w-12 rounded-full object-cover border border-transparent dark:border-white/[0.08] bg-zinc-200 dark:bg-white/[0.04]" />
            </div>
            <div className="flex-1 flex flex-col gap-5 min-w-0">
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Game Title"
                  className="w-full text-2xl font-bold bg-transparent border-none outline-none text-black dark:text-white placeholder-gray-500 focus:ring-0 p-0"
                  value={gameName}
                  onChange={e => setGameName(e.target.value)}
                />
                <textarea
                  placeholder="What's special about your game?"
                  className="w-full text-lg bg-transparent border-none outline-none text-black dark:text-white placeholder-gray-500 resize-none focus:ring-0 min-h-[90px] p-0 mt-2"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              {/* Video Trailer */}
              <div className="flex flex-col gap-3">
                {videoUpload ? (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-black/20 group">
                    <video src={videoUpload.preview} controls className="w-full h-[300px] object-contain bg-black/40" />
                    <div className="absolute top-4 right-4 pointer-events-none bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider">
                      {(() => {
                        const videoName =
                          videoUpload.file?.name ||
                          pendingDraft?.videoDemo?.name ||
                          "Uploaded Trailer";

                        return (
                          <>
                            {videoName.substring(0, 18)}
                            {videoName.length > 18 ? "…" : ""}
                          </>
                        );
                      })()}
                    </div>
                    {!isButtonBusy && (
                      <button type="button" onClick={handleRemoveVideo} className="absolute top-4 left-4 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition-colors text-white">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className="border border-dashed border-gray-200 dark:border-white/[0.1] rounded-2xl py-16 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all group"
                  >
                    <div className="p-3 rounded-full bg-[#3D7A6E]/10 dark:bg-[#3D7A6E]/20 text-[#3D7A6E] group-hover:scale-110 transition-transform">
                      <Video size={32} />
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 font-medium">Upload Gameplay Trailer</p>
                      <p className="text-[10px] text-gray-400 mt-1">.mp4, .webm, .mov (Max 50 MB)</p>
                    </div>
                  </div>
                )}
                <input ref={videoInputRef} type="file" hidden accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoChange} />
              </div>

              {/* Live Preview */}
              <div className="pt-4 mt-2 border-t border-gray-100 dark:border-white/[0.06]">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Post Preview</p>
                <article className="relative w-full border border-gray-200 dark:border-white/[0.06] rounded-xl bg-gray-50/50 dark:bg-black/20 pointer-events-none">
                  <div className="flex gap-3 p-4">
                    <img src={logoImage} alt={brandName} className="h-10 w-10 rounded-full object-cover mt-1 border border-gray-100 dark:border-white/[0.08]" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-black dark:text-white">{brandName}</span>
                        <span className="text-xs text-gray-500">Just now</span>
                      </div>
                      {description && (
                        <p className="mt-2 mb-3 text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap line-clamp-2">{description}</p>
                      )}
                      <div className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.06] bg-gray-100 dark:bg-white/[0.04]">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#3D7A6E]/20 via-transparent to-purple-500/10 opacity-50" />
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
                            <h3 className="text-lg font-black text-white tracking-tight leading-none drop-shadow-md">{gameName || 'Game Title'}</h3>
                            <div className="text-white px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg" style={{ background: 'linear-gradient(to bottom right, #3D7A6E, #000000)' }}>
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

        {/* ══ TAB: Build ══ */}
        {activeTab === 'build' && (
          <div className="p-6 flex flex-col gap-6">
            <section className="space-y-3">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Game Build File</label>
              {asset ? (
                <div className="p-4 bg-gray-50 dark:bg-white/[0.04] rounded-xl border border-[#3D7A6E]/30 dark:border-[#3D7A6E]/30">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#3D7A6E]/20 dark:bg-[#3D7A6E]/30 text-[#3D7A6E] dark:text-[#4A9384] rounded-lg">
                      <FileArchive size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-black dark:text-white truncate">{asset.name}</p>
                      <p className="text-[10px] text-gray-500 font-bold">{(asset.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    {!isButtonBusy && (
                      <button onClick={() => setAsset(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-white/[0.08] rounded-full transition-colors">
                        <X size={16} className="text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-gray-200 dark:border-white/[0.1] rounded-2xl py-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all group"
                >
                  <div className="p-4 rounded-full bg-[#3D7A6E]/10 dark:bg-[#3D7A6E]/20 text-[#3D7A6E] group-hover:scale-110 transition-transform">
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

            <section className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#3D7A6E] uppercase tracking-wider pl-1 flex items-center gap-1">
                Start Path <span className="text-red-400">*</span>
              </label>
              <input
                placeholder="e.g. MyGame_Build/Game.exe"
                value={startPath}
                onChange={e => setStartPath(e.target.value)}
                className="w-full bg-gray-50 dark:bg-white/[0.02] text-black dark:text-white p-3 rounded-xl border border-gray-200 dark:border-white/[0.1] focus:border-[#3D7A6E] focus:ring-1 focus:ring-[#3D7A6E] outline-none transition-all font-mono text-sm"
              />
              <div className="px-3 py-2 bg-[#3D7A6E]/5 dark:bg-[#3D7A6E]/10 border border-[#3D7A6E]/20 dark:border-[#3D7A6E]/30 rounded-lg mt-1 space-y-1">
                <p className="text-[10px] text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                  Path inside your archive. <strong className="text-[#2F5E55] dark:text-[#4A9384]">No leading /</strong>
                </p>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 space-y-2 mt-1.5">
                  <p>
                    <span className="font-bold text-gray-600 dark:text-gray-400">In a folder:</span>
                    <span className="ml-2 text-[#2F5E55] dark:text-[#4A9384] font-mono font-bold bg-[#3D7A6E]/10 dark:bg-[#3D7A6E]/20 border border-[#3D7A6E]/20 px-2 py-0.5 rounded">MyGame_Build/Game.exe</span>
                  </p>
                  <p>
                    <span className="font-bold text-gray-600 dark:text-gray-400">At root:</span>
                    <span className="ml-2 text-[#2F5E55] dark:text-[#4A9384] font-mono font-bold bg-[#3D7A6E]/10 dark:bg-[#3D7A6E]/20 border border-[#3D7A6E]/20 px-2 py-0.5 rounded">Game.exe</span>
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ══ TAB: Payment ══ */}
        {activeTab === 'payment' && (
          <div className="p-6 flex flex-col gap-5">
            <section className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-black/20 overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard size={16} className="text-[#3D7A6E]" />
                  <span className="text-sm font-bold text-black dark:text-white">Purchase Credits</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  1 Dollar = 40 Credits. 10 Credits = 1 session (10 mins).
                </p>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                    Enter Dollars (Min $100, Max $5000)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      min={100}
                      max={5000}
                      step={0.25}
                      value={dollars || ''}
                      onChange={e => setDollars(Number(e.target.value))}
                      className="w-full text-sm bg-white dark:bg-white/[0.04] text-black dark:text-white py-3 pl-8 pr-3 rounded-xl border border-gray-200 dark:border-white/[0.1] focus:border-[#3D7A6E] focus:ring-1 focus:ring-[#3D7A6E] outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="range"
                    min={100}
                    max={5000}
                    step={0.25}
                    value={dollars}
                    onChange={e => setDollars(Number(e.target.value))}
                    className="w-full accent-[#3D7A6E]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1">
                    <span>$100</span>
                    <span>$5,000</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="rounded-xl bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] p-3 text-center">
                    <div className="text-lg font-black text-black dark:text-white">{effectiveCredits || '—'}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Credits</div>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] p-3 text-center">
                    <div className="text-lg font-black text-[#3D7A6E]">{estimatedSessions || '—'}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Sessions</div>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] p-3 text-center">
                    <div className="text-lg font-black text-emerald-500">${totalDollars.toFixed(2) || '—'}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Total</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02]">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Purchase Summary</p>
              </div>
              <div className="px-5 py-4 space-y-3 bg-white dark:bg-black/20">
                {[
                  ['Credits Purchased', effectiveCredits ? `${effectiveCredits} credits` : '—'],
                  ['Rate', '40 credits per $1'],
                  ['Amount Payable', effectiveCredits ? `$${totalDollars.toFixed(2)}` : '—'],
                  ['Currency', 'USD'],
                  ['Payment Method', 'Razorpay'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs font-bold text-black dark:text-white">{value}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 dark:border-white/[0.06] pt-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-black dark:text-white">Total</span>
                  <span className="text-lg font-black text-[#3D7A6E]">${totalDollars.toFixed(2) || '—'}</span>
                </div>
              </div>
            </section>

            <div className="flex gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
              <Zap size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                Your game will go live immediately after payment. Credits are non-refundable once your post is published.
                If publishing fails after payment, your credits are safe and our team will resolve it.
              </p>
            </div>

            {draftStatus === 'failed' && (
              <div className="flex gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-700 dark:text-red-400 leading-relaxed">
                  Publishing encountered an error, but your payment was received. Our team has been notified and will manually resolve this shortly.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Upload Progress Footer ── */}
      {(isUploading || isSavingDraft) && (
        <div className="border-t border-[#3D7A6E]/20 bg-[#3D7A6E]/5 dark:bg-black/40 backdrop-blur-md flex flex-col shrink-0">
          <div className="px-6 py-4 space-y-3">
            {isUploading && (
              <div className="flex justify-end">
                <button
                  onClick={handleCancelUpload}
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-red-500 hover:text-red-600 transition-colors"
                >
                  <StopCircle size={13} /> Cancel
                </button>
              </div>
            )}
            {isSavingDraft && !isUploading && (
              <p className="text-xs text-[#3D7A6E] dark:text-[#4A9384] font-semibold animate-pulse text-center">Saving draft…</p>
            )}
            {asset?.status === 'uploading' && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                  <span className="text-[#3D7A6E] dark:text-[#4A9384] flex items-center gap-1.5"><FileArchive size={12} /> Uploading Game Build</span>
                  <span className="text-[#3D7A6E] dark:text-[#4A9384]">{asset.progress ?? 0}%</span>
                </div>
                <div className="h-2 bg-[#3D7A6E]/20 dark:bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full bg-[#3D7A6E] transition-all duration-300 ease-out shadow-[0_0_8px_rgba(61,122,110,0.4)]" style={{ width: `${asset.progress ?? 0}%` }} />
                </div>
              </div>
            )}
            {videoUpload?.status === 'uploading' && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                  <span className="text-[#3D7A6E] dark:text-[#4A9384] flex items-center gap-1.5"><Video size={12} /> Uploading Trailer</span>
                  <span className="text-[#3D7A6E] dark:text-[#4A9384]">{videoUpload.progress ?? 0}%</span>
                </div>
                <div className="h-2 bg-[#3D7A6E]/20 dark:bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full bg-[#3D7A6E] transition-all duration-300 ease-out shadow-[0_0_8px_rgba(61,122,110,0.4)]" style={{ width: `${videoUpload.progress ?? 0}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Publishing progress banner */}
      {isPublishing && (
        <div className="border-t border-emerald-100 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 backdrop-blur-md px-6 py-4 flex items-center gap-3 shrink-0">
          <Loader2 size={16} className="text-emerald-500 animate-spin shrink-0" />
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
            {publishingStates[draftStatus] || 'Publishing your game…'}
          </p>
        </div>
      )}

      {/* ── Footer counter ── */}
      <div className="border-t border-gray-100 dark:border-white/[0.06] bg-transparent px-6 py-4 flex items-center justify-between shrink-0">
        <div className="text-xs font-bold text-gray-400 dark:text-gray-500">
          {asset ? '1' : '0'} / 1 Build • {videoUpload ? '1' : '0'} / 1 Media
        </div>
        {activeTab === 'payment' && totalDollars >= 100 && (
          <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
            $1 = 40 Credits &nbsp;·&nbsp; 10 Credits = 1 session
          </div>
        )}
      </div>

    </div>
  );
};

export default GamePostForm;