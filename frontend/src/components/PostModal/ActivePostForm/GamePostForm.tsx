import React, { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';
import axios from 'axios';
import api from '../../../utils/api';
import {
  X, Upload, FileArchive, Info, Video, StopCircle,
  ArrowLeft, Gamepad2, Users, CreditCard, Zap,
  CheckCircle2, Loader2, AlertTriangle, Gift
} from 'lucide-react';
import { useUser } from "../../../context/user";
import { MentionTextarea } from './MentionTextarea';
import { loadRazorpay } from '../../../utils/loadRazorpay';

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
  status?: 'pending' | 'uploading' | 'done' | 'error' | 'cancelled';
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  uploadedKey?: string;
  uploadedUrl?: string;
}

type DraftStatus =
  | 'draft' | 'uploading' | 'ready_for_payment'
  | 'payment_pending' | 'payment_completed'
  | 'publishing' | 'published' | 'failed';

const CHUNK_SIZE = 10 * 1024 * 1024;
const ALLOWED_BUILD_EXTENSIONS = ['7z', 'zip'];
const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'];
const POLL_INTERVAL_MS = 2500;

declare global {
  interface Window {
    Razorpay: any;
  }
}

const GamePostForm: React.FC<PostModalProps> = ({ onCancel, onBack }) => {
  const { user } = useUser();
  const brandName = user?.username || 'Guest';
  const logoImage = user?.avatar || '/default_avatar.png';

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'details' | 'build' | 'payment'>('details');

  // ── Details ───────────────────────────────────────────────────────────────
  const [gameName, setGameName] = useState('');
  const [description, setDescription] = useState('');
  const [maxSessionDurationMinutes, setMaxSessionDurationMinutes] = useState(10);
  const [steamUrl, setSteamUrl] = useState('');
  const [steamUrlError, setSteamUrlError] = useState('');

  // ── Build ─────────────────────────────────────────────────────────────────
  const [asset, setAsset] = useState<GameAsset | null>(null);
  const [startPath, setStartPath] = useState('');
  const [videoUpload, setVideoUpload] = useState<VideoUploadState | null>(null);

  // Sponsored State
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [isSponsored, setIsSponsored] = useState(false);
  const [sponsoredCredits, setSponsoredCredits] = useState(0);

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

  const effectiveCredits = Math.floor(dollars * 4) * 10;
  const totalDollars = effectiveCredits / 40;

  const canProceedToBuild =
    gameName.trim().length > 0 &&
    gameName.trim().length <= 120 &&
    description.trim().length > 0 &&
    videoUpload !== null &&
    !steamUrlError; // Prevents proceeding if there's an invalid Steam URL

  const isValidStartPath =
    startPath.trim().length > 0 &&
    !startPath.startsWith('/') &&
    !startPath.includes('..');

  const canProceedToPayment =
    canProceedToBuild &&
    !!asset &&
    isValidStartPath &&
    maxSessionDurationMinutes >= 1 && // Added it here instead
    maxSessionDurationMinutes <= 120;
  const isSponsoredApproved = isSponsored && approvalStatus === 'approved';
  const canPayAndPublish =
    canProceedToPayment &&
    ((totalDollars >= 100 && totalDollars <= 5000) || isSponsoredApproved);

  const finalCredits = isSponsoredApproved ? sponsoredCredits : effectiveCredits;

  // 1 Credit = 1 Minute mapping
  const playableMinutes = finalCredits;
  const estimatedSessions = maxSessionDurationMinutes > 0
    ? Math.floor(playableMinutes / maxSessionDurationMinutes)
    : 0;

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

        // Capture sponsorship status during polling without refresh
        if (data.game?.sponsorship) {
          setApprovalStatus(data.game.sponsorship.status || 'pending');
          setIsSponsored(data.game.sponsorship.enabled || false);
          setSponsoredCredits(data.game.sponsorship.initialCredits || 0);
        }

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
    setSteamUrl(data.game?.steamUrl || "");
    setDraftStatus(data.status || "draft");
    setMaxSessionDurationMinutes(
      data.game?.maxSessionDurationMinutes ?? 10
    );

    setApprovalStatus(data.game?.sponsorship?.status || 'pending');
    setIsSponsored(data.game?.sponsorship?.enabled || false);
    setSponsoredCredits(data.game?.sponsorship?.initialCredits || 0);
    if (data.selectedCredits && !data.game?.sponsorship?.enabled) setDollars(Math.max(100, data.selectedCredits / 40));

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
        preview: data.videoDemo.optimizedUrl || data.videoDemo.url,
        progress: 100,
        status: "done",
        processingStatus: data.videoDemo.processingStatus,
        uploadedKey: data.videoDemo.key,
        uploadedUrl: data.videoDemo.url,
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

  const handleDiscard = () => {
    const id = pendingDraft?._id || pendingDraft?.draftId;

    // Instant UI update
    localStorage.removeItem("activeGameDraftId");
    setPendingDraft(null);

    // Background cleanup
    if (id) {
      api.delete(`/api/gamePosts/draft/${id}`).catch((err) => {
        console.error("Failed to delete draft:", err);
      });
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

  const isValidSteamUrl = (url: string) => {
    if (!url) return true; // Empty input is allowed/handled separately if required

    // Matches store links or community links
    const steamRegex = /^https?:\/\/(www\.)?(store\.steampowered|steamcommunity)\.com\/.+/i;
    return steamRegex.test(url.trim());
  };

  // Validate and update Steam URL
  const handleSteamUrlChange = (value: string) => {
    setSteamUrl(value);

    if (value && !isValidSteamUrl(value)) {
      setSteamUrlError('Please enter a valid Steam URL (e.g., store.steampowered.com)');
    } else {
      setSteamUrlError('');
    }
  };
  // ── Draft persistence ─────────────────────────────────────────────────────
  const saveDraftMeta = async (
    currentDraftId?: string | null
  ): Promise<string> => {
    setIsSavingDraft(true);
    const payload = {
      draftId: currentDraftId,
      description,
      game: { gameName, startPath, platform: 'windows', maxSessionDurationMinutes, steamUrl },
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

  const uploadBuildIfNeeded = async (draftId: string) => {
    if (!asset) return;

    if (asset.uploadedKey && asset.uploadedUrl) {
      return;
    }

    if (!asset.file) {
      throw new Error("Please re-select your game build.");
    }

    const abort = new AbortController();
    gameAbortRef.current = abort;
    setIsUploading(true);

    try {
      setAsset(prev =>
        prev
          ? {
            ...prev,
            status: "uploading",
            progress: 0,
          }
          : prev
      );

      const { fileUrl, key } =
        await uploadGameToS3(
          asset,
          p =>
            setAsset(prev =>
              prev
                ? {
                  ...prev,
                  progress: p,
                }
                : prev
            ),
          abort.signal
        );

      setAsset(prev =>
        prev
          ? {
            ...prev,
            uploadedKey: key,
            uploadedUrl: fileUrl,
            status: "done",
            progress: 100,
          }
          : prev
      );

      await api.post(
        `/api/gamePosts/draft/${draftId}/build`,
        {
          name: asset.name,
          key,
          url: fileUrl,
          size: asset.size,
        }
      );
    } finally {
      gameAbortRef.current = null;
    }
  };

  const uploadVideoIfNeeded = async (draftId: string) => {
    if (!videoUpload) return;

    if (
      videoUpload.status === "done" &&
      !videoUpload.file
    ) {
      return;
    }

    if (!videoUpload.file) {
      throw new Error("Please re-select your trailer.");
    }

    const abort = new AbortController();
    videoAbortRef.current = abort;
    setIsUploading(true);

    try {
      setVideoUpload(prev =>
        prev
          ? {
            ...prev,
            status: "uploading",
            progress: 0,
          }
          : prev
      );

      const { fileUrl, key } =
        await uploadVideoDemoToS3(
          videoUpload.file,
          p =>
            setVideoUpload(prev =>
              prev
                ? {
                  ...prev,
                  progress: p,
                }
                : prev
            ),
          abort.signal
        );

      await api.post(
        `/api/gamePosts/draft/${draftId}/video`,
        {
          name: videoUpload.file.name,
          key,
          url: fileUrl,
          size: videoUpload.file.size,
        }
      );

      setVideoUpload(prev =>
        prev
          ? {
            ...prev,
            status: "done",
            progress: 100,
            file: null,
            uploadedKey: key,
            uploadedUrl: fileUrl,
          }
          : prev
      );
    } finally {
      videoAbortRef.current = null;
    }
  };

  const handleManualSave = async () => {
    try {
      setErrorMessage(null);

      let activeDraftId = draftId;

      if (!activeDraftId) {
        activeDraftId = await saveDraftMeta(null);
      }

      // upload files concurrently
      try {
        await Promise.all([
          uploadBuildIfNeeded(activeDraftId),
          uploadVideoIfNeeded(activeDraftId),
        ]);
      } finally {
        setIsUploading(false);
      }

      // save latest metadata again
      await saveDraftMeta(activeDraftId);

    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
        err.message ||
        "Failed to save draft"
      );
    }
  };

  // ── File handlers ─────────────────────────────────────────────────────────
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isValidBuildFile(file)) {
      setErrorMessage('Invalid build format. Only .7z and .zip are allowed.');
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
    signal: AbortSignal
  ): Promise<{ fileUrl: string; key: string }> => {
    const { data } = await api.post('/api/upload/presigned-url', {
      fileName: file.name, fileType: file.type,
      category: 'media', subcategory: 'game', fileSize: file.size,
    });

    await axios.put(data.uploadUrl, file, {
      headers: { 'Content-Type': file.type },
      signal: signal,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          onProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
        }
      }
    });

    return { fileUrl: data.fileUrl, key: data.key };
  };

  // ── Main: Pay & Publish flow ──────────────────────────────────────────────
  const handleFinalAction = async () => {
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
        activeDraftId = await saveDraftMeta(null);
      }

      // --------------------------------------------------
      // UPLOAD CONCURRENTLY
      // --------------------------------------------------
      try {
        await Promise.all([
          uploadBuildIfNeeded(activeDraftId),
          uploadVideoIfNeeded(activeDraftId),
        ]);
      } finally {
        setIsUploading(false);
      }

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
      // SPONSORED FAST-TRACK
      // --------------------------------------------------
      if (isSponsoredApproved) {
        setIsPublishing(true);
        await api.post(`/api/gamePosts/draft/${activeDraftId}/publish-sponsored`);
        setDraftStatus("payment_completed");
        startPolling(activeDraftId!);
        return;
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
            selectedCredits: finalCredits,
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
              description: `${finalCredits} Credits — ${gameName}`,
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
            onClick={() => handleDiscard()}
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
      <div className="w-full max-w-md mx-auto bg-white dark:bg-[#111111] rounded-[2rem] border border-gray-200 dark:border-white/[0.08] flex flex-col items-center justify-center p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Subtle background success glow */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#3D7A6E]/10 to-transparent pointer-events-none" />

        {/* Animated Icon */}
        <div className="relative mb-6 z-10">
          <div className="absolute inset-0 bg-[#3D7A6E] blur-xl opacity-30 rounded-full animate-pulse" />
          <div className="relative p-5 rounded-full bg-[#3D7A6E]/10 dark:bg-[#3D7A6E]/20 border border-[#3D7A6E]/30">
            <CheckCircle2 size={48} className="text-[#3D7A6E] dark:text-[#4A9384]" />
          </div>
        </div>

        {/* Header Text */}
        <div className="text-center space-y-2 mb-8 z-10">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Game Published!
          </h2>
          <p className="text-[#3D7A6E] dark:text-[#4A9384] font-medium text-sm sm:text-base">
            Your game is now live on Rigzer.
          </p>
        </div>

        {/* Details Summary Card */}
        <div className="w-full bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.08] rounded-2xl p-6 mb-6 z-10">
          {/* Game Title & Top-level stat */}
          <div className="border-b border-gray-200 dark:border-white/[0.08] pb-4 mb-4">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white truncate">
              {gameName || 'Untitled Game'}
            </h3>
            <p className="text-[#3D7A6E] dark:text-[#4A9384] font-bold text-sm mt-1">
              {finalCredits} credits added
            </p>
          </div>

          {/* Granular Stats (Label / Value pairs) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Playable time</span>
              <span className="font-bold text-gray-900 dark:text-white">{playableMinutes} min</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Demo length</span>
              <span className="font-bold text-gray-900 dark:text-white">{maxSessionDurationMinutes} min</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Est. sessions</span>
              <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                ≈{estimatedSessions}
                <span className="text-gray-400 dark:text-gray-500 font-normal text-[11px]">
                  ({maxSessionDurationMinutes}m each)
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Sponsor Badge */}
        {isSponsoredApproved && (
          <div className="mb-8 z-10 flex items-center justify-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
            <Gift size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tracking-widest uppercase">
              Sponsored by Rigzer
            </span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onCancel}
          className="w-full max-w-[200px] bg-[#3D7A6E] hover:bg-[#2F5E55] text-white font-bold px-8 py-3.5 rounded-full text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 z-10"
        >
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
    if (isSponsoredApproved) return 'Publish Sponsored Game';
    return `Pay $${totalDollars.toFixed(2)} & Publish`;
  })();

  const isButtonBusy = isUploading || isCreatingOrder || isPublishing;

  // ── Render Form ───────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-2xl mx-auto bg-white/[0.03] backdrop-blur-2xl min-h-[75vh] max-h-[90vh] rounded-3xl border border-gray-200 dark:border-white/[0.06] flex flex-col overflow-hidden shadow-2xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.06] bg-transparent sticky top-0 z-30">

        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-full transition-colors">
              <ArrowLeft size={18} className="text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <h2 className="text-xl font-bold text-black dark:text-white tracking-tight leading-tight">Publish Game</h2>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Save Draft Button */}
          <button
            onClick={handleManualSave}
            disabled={isSavingDraft || isButtonBusy || !canProceedToBuild}
            className="px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-transparent hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-full transition-all disabled:opacity-40 flex items-center gap-2"
          >
            {isSavingDraft ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Draft'
            )}
          </button>

          {/* Primary Action Button */}
          {activeTab === 'payment' ? (
            <button
              onClick={handleFinalAction}
              disabled={!canPayAndPublish || isButtonBusy}
              className="bg-[#3D7A6E] hover:bg-[#2F5E55] disabled:opacity-40 text-white font-bold px-6 py-2 rounded-full text-sm transition shadow-sm flex items-center gap-2 shrink-0"
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
              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white font-bold px-6 py-2 rounded-full text-sm transition shadow-sm shrink-0"
            >
              Next →
            </button>
          )}
        </div>
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
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px ${activeTab === tab
                ? 'border-white text-white '
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
                <MentionTextarea
                  placeholder="What's special about your game?"
                  className="w-full text-lg bg-transparent border-none outline-none text-black dark:text-white placeholder-gray-500 resize-none focus:ring-0 min-h-[90px] p-0 mt-2"
                  value={description}
                  rows={2}
                  onChange={setDescription}
                />
              </div>

              {/* Video Trailer */}
              <div className="flex flex-col gap-3 mt-4">
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
                    <div className="p-3 rounded-full bg-white/10 dark:bg-white/20 text-white group-hover:scale-110 transition-transform">
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

              {/* Steam URL Input Field */}
              {/* Steam URL Input Field */}
              <div className="flex flex-col gap-1.5 mt-2">
                <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors ${steamUrlError
                  ? 'border-red-500/80 bg-red-500/5 dark:bg-red-500/10'
                  : 'border-gray-200 dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02] focus-within:border-gray-400 dark:focus-within:border-white/20'
                  }`}>
                  <img
                    src="/steamLogo.png"
                    alt="Steam"
                    className="h-8 w-8 object-contain flex-shrink-0 opacity-80 dark:invert"
                  />
                  <input
                    type="url"
                    placeholder="https://store.steampowered.com/app/..."
                    className="w-full text-sm bg-transparent border-none outline-none text-black dark:text-white placeholder-gray-400 focus:ring-0 p-0"
                    value={steamUrl}
                    onChange={e => handleSteamUrlChange(e.target.value)}
                  />
                </div>

                {steamUrlError && (
                  <p className="text-xs text-red-500 font-medium px-1">{steamUrlError}</p>
                )}
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
                    <div className="p-3 bg-white/10 dark:bg-white/20 text-white rounded-lg">
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
                  <div className="p-4 rounded-full bg-white/10 dark:bg-white/20 text-white group-hover:scale-110 transition-transform">
                    <Upload size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-gray-900 dark:text-white font-bold text-sm">Upload Game Build</p>
                    <p className="text-[10px] text-gray-500 mt-1">.zip, .7z</p>
                  </div>
                </div>
              )}
              <input ref={fileInputRef} type="file" hidden accept=".7z,.zip,application/x-7z-compressed,application/zip" onChange={handleFileChange} />
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
              <div className="px-3 py-2 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.1] rounded-xl mt-1">
                <p className="text-[10px] text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                  Path inside your archive. <strong className="text-[#2F5E55] dark:text-[#4A9384]">No leading /</strong>
                </p>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 space-y-2 mt-1.5">
                  <p>
                    <span className="font-bold text-gray-600 dark:text-gray-400">In a folder:</span>
                    <span className="ml-2 text-[#2F5E55] dark:text-[#4A9384] font-mono font-bold px-2 py-0.5 ">MyGame_Build/Game.exe</span>
                  </p>
                  <p>
                    <span className="font-bold text-gray-600 dark:text-gray-400">At root:</span>
                    <span className="ml-2 text-[#2F5E55] dark:text-[#4A9384] font-mono font-bold px-2 py-0.5 ">Game.exe</span>
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">
                Maximum Demo Duration
              </label>

              <div className="flex flex-col gap-3">
                {/* Quick Presets */}
                <div className="flex gap-2">
                  {[10, 15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setMaxSessionDurationMinutes(mins)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${maxSessionDurationMinutes === mins
                        ? 'bg-white border-gray-200 text-black dark:bg-white dark:border-white dark:text-black shadow-sm'
                        : 'bg-transparent border-gray-200 dark:border-white/[0.1] text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                        }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>

                {/* Custom Input with Suffix */}
                <div className="relative group">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    step={1}
                    value={maxSessionDurationMinutes || ''}
                    onKeyDown={(e) => {
                      // Prevent decimal points, commas, scientific notation 'e', and signs
                      if (['.', ',', 'e', 'E', '-', '+'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setMaxSessionDurationMinutes(isNaN(val) ? 0 : val);
                    }}
                    onBlur={() => {
                      if (maxSessionDurationMinutes < 1) setMaxSessionDurationMinutes(1);
                      if (maxSessionDurationMinutes > 120) setMaxSessionDurationMinutes(120);
                    }}
                    className="w-full bg-gray-50 dark:bg-white/[0.02] text-gray-900 dark:text-white p-3 pr-20 rounded-xl border border-gray-200 dark:border-white/[0.1] focus:border-[#3D7A6E] focus:ring-1 focus:ring-[#3D7A6E] outline-none transition-all font-mono text-sm"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pointer-events-none">
                    Minutes
                  </span>
                </div>
              </div>

              {/* Matched bg, border, and border-radius to the custom input above it */}
              <div className="px-3 py-2 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.1] rounded-xl mt-1">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                  Players can play for up to <strong className="text-gray-900 dark:text-white">{maxSessionDurationMinutes} minutes</strong>.
                  The demo ends automatically if this limit is reached or if remaining credits run out.
                </p>
              </div>
            </section>
          </div>
        )}

        {/* ══ TAB: Payment ══ */}
        {activeTab === 'payment' && (
          <div className="p-6 flex flex-col gap-6">
            {isSponsoredApproved ? (
              // Clean, minimal Sponsored View
              <section className="rounded-2xl border border-gray-200 dark:border-white/[0.1] bg-gray-50 dark:bg-white/[0.02] p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Admin Sponsored Post
                  </h3>
                  <p className="text-[11px] mt-1 text-gray-500 dark:text-gray-400">
                    Rigzer has approved and sponsored this post. You can publish immediately without any payment.
                  </p>
                </div>

                <div className="bg-white dark:bg-black/20 rounded-xl p-5 space-y-3 border border-gray-200 dark:border-white/[0.06]">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Sponsored Credits</span>
                    <span className="font-bold text-gray-900 dark:text-white">{sponsoredCredits}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Gameplay Time</span>
                    <span className="font-bold text-gray-900 dark:text-white">{playableMinutes} min</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Demo Duration</span>
                    <span className="font-bold text-gray-900 dark:text-white">{maxSessionDurationMinutes} min</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Estimated Sessions</span>
                    <span className="font-bold text-gray-900 dark:text-white">{estimatedSessions} <span className="text-gray-400 text-xs font-normal">({maxSessionDurationMinutes} min each)</span></span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-white/[0.06] pt-3 mt-1 flex justify-between items-center text-sm">
                    <span className="font-bold text-gray-500 dark:text-gray-400">Payment</span>
                    <span className="font-bold text-gray-900 dark:text-white uppercase tracking-wide">Sponsored</span>
                  </div>
                </div>
              </section>
            ) : (
              // Clean Purchase View with Restored Header
              <section className="rounded-2xl border border-gray-200 dark:border-white/[0.1] bg-gray-50 dark:bg-transparent overflow-hidden">

                {/* Restored Header */}
                <div className="px-5 pt-5 pb-4 border-b border-gray-200 dark:border-white/[0.08]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <CreditCard size={18} className="text-gray-900 dark:text-white" />
                    <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-wide">Purchase Credits</h3>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    1 Dollar = 40 Credits. 1 Credit = 1 Minute. Estimated sessions depend on the demo duration you selected.
                  </p>
                </div>

                <div className="p-5 space-y-6">
                  {/* Amount Input */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                      Enter Dollars (Min $100, Max $5000)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">$</span>
                      <input
                        type="number"
                        min={100}
                        max={5000}
                        step={0.25}
                        value={dollars || ''}
                        onChange={e => setDollars(Number(e.target.value))}
                        className="w-full text-base font-medium bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white py-3.5 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-white/[0.1] focus:border-[#3D7A6E] focus:ring-1 focus:ring-[#3D7A6E] outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Range Slider */}
                  <div className="px-1">
                    <input
                      type="range"
                      min={100}
                      max={5000}
                      step={0.25}
                      value={dollars}
                      onChange={e => setDollars(Number(e.target.value))}
                      className="w-full accent-[#3D7A6E] h-2 bg-gray-200 dark:bg-white/[0.1] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-500 font-bold mt-3">
                      <span>$100</span>
                      <span>$5,000</span>
                    </div>
                  </div>

                  {/* Neutral Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] p-4 text-center flex flex-col justify-center shadow-sm">
                      <div className="text-lg font-black text-gray-900 dark:text-white leading-none">{finalCredits || '0'}</div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">Credits</div>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] p-4 text-center flex flex-col justify-center shadow-sm">
                      <div className="text-lg font-black text-gray-900 dark:text-white leading-none">{playableMinutes || '0'}</div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">Mins</div>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] p-4 text-center flex flex-col justify-center shadow-sm">
                      <div className="text-lg font-black text-gray-900 dark:text-white leading-none">{estimatedSessions || '0'}</div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2 leading-tight">Sessions <span className="opacity-70">({maxSessionDurationMinutes}m)</span></div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Clean Purchase Summary */}
            {!isSponsoredApproved && (
              <section className="rounded-2xl border border-gray-200 dark:border-white/[0.1] overflow-hidden bg-gray-50 dark:bg-white/[0.02]">
                <div className="px-5 py-4 border-b border-gray-200 dark:border-white/[0.08]">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Purchase Summary</p>
                </div>
                <div className="px-5 py-5 space-y-3.5">
                  {[
                    ['Credits Purchased', finalCredits ? `${finalCredits} credits` : '—'],
                    ['Rate', '40 credits = $1'],
                    ['Amount Payable', finalCredits ? `$${totalDollars.toFixed(2)}` : '—'],
                    ['Currency', 'USD'],
                    ['Payment Method', 'Razorpay'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-[13px] text-gray-500 dark:text-gray-400">{label}</span>
                      <span className="text-[13px] font-bold text-gray-900 dark:text-white">{value}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 dark:border-white/[0.08] pt-4 mt-2 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">Total</span>
                    <span className="text-lg font-black text-[#3D7A6E]">${totalDollars.toFixed(2) || '—'}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Elevated Information Box */}
            {!isSponsoredApproved && (
              <div className="flex gap-3 p-4 rounded-xl bg-gray-100 dark:bg-white/[0.06] border border-gray-300 dark:border-white/[0.15] shadow-sm">
                <Info size={18} className="text-gray-600 dark:text-gray-300 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">
                  Your game will go live immediately after payment. <span className="font-bold text-black dark:text-white">Credits are non-refundable</span> once your post is published. If publishing fails after payment, your credits are safe and our team will resolve it.
                </p>
              </div>
            )}

            {/* Minimal Error Box */}
            {draftStatus === 'failed' && (
              <div className="flex gap-3 p-4 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 shadow-sm">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-600 dark:text-red-400 leading-relaxed">
                  Publishing encountered an error, but your payment was received. For assistance, please contact our support team.
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

    </div>
  );
};

export default GamePostForm;