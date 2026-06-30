import { X, Camera, Check } from "lucide-react";
import { useState, useRef, ChangeEvent, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop"; // Import the cropper
import axios from "axios";
import { getCroppedImage } from "../../utils/cropImage";
import { useUser } from "../../context/user";

interface EditProfileModalProps {
  onClose: () => void;
  onSaved: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose, onSaved }) => {
  const { user, refreshUser } = useUser();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
  // States for the image adjustment UI
  const [editingImage, setEditingImage] = useState<{ url: string; type: 'avatar' | 'banner' } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  const [usernameMessage, setUsernameMessage] = useState("");
  const usernameCache = useRef(new Map());
  const controllerRef = useRef<AbortController | null>(null);
  if (!user) return null;

  const [form, setForm] = useState({
    displayName: user.displayName || "",
    username: user.username || "",
    bio: user.bio || "",
    location: user.location || "",
    website: user.website || "",
    birthDate: user.birthdate
      ? user.birthdate.slice(0, 10)
      : "",
    jobTitle: user.jobTitle || "",
    avatar: user.avatar || null,
    banner: user.banner || null,
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setEditingImage({ url: reader.result as string, type });
      });
      reader.readAsDataURL(file);
    }
  };
  const uploadToS3 = async (file: Blob, type: "avatar" | "banner") => {

    const res = await axios.post(`${BACKEND_URL}/api/upload/presigned-url`, {
      fileName: `${type}.jpg`,
      fileType: file.type,
      category: "media",
    });

    await axios.put(res.data.uploadUrl, file, {
      headers: { "Content-Type": file.type },
    });

    return res.data.fileUrl as string;
  };

  const onCropComplete = useCallback((_: any, clippedPixels: any) => {
    setCroppedAreaPixels(clippedPixels);
  }, []);

  const applyCrop = async () => {
    if (!editingImage || !croppedAreaPixels) return;

    try {
      const croppedBlob = await getCroppedImage(
        editingImage.url,
        croppedAreaPixels
      );

      const uploadedUrl = await uploadToS3(
        croppedBlob,
        editingImage.type
      );

      setForm((prev) => ({
        ...prev,
        [editingImage.type]: uploadedUrl,
      }));

      setEditingImage(null);
      setZoom(1);
    } catch (err) {
      console.error("Image upload failed", err);
    }
  };

  const saveProfile = async () => {
    try {
      setIsSaving(true);
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

      await axios.patch(
        `${BACKEND_URL}/api/me`,
        {
          displayName: form.displayName,
          username: form.username,
          bio: form.bio,
          location: form.location,
          website: form.website,
          birthdate: form.birthDate,
          jobTitle: form.jobTitle,
          avatar: form.avatar,
          banner: form.banner,
        },
        { withCredentials: true }
      );

      await refreshUser();
      onSaved?.(); // ← call if provided (handles cache clear + modal close)
      if (!onSaved) onClose(); // ← fallback for any usage without onSaved
    } catch (err) {
      console.error("Update failed", err);
    }
    finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const username = form.username.trim().toLowerCase();
    // User didn't change username
    if (username === user.username.toLowerCase()) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }

    // Too short, don't hit backend
    if (username.length < 3) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }
    const timeout = setTimeout(async () => {

      // Cache hit
      if (usernameCache.current.has(username)) {
        const cached: any = usernameCache.current.get(username);
        setUsernameStatus(
          cached.available ? "available" : "taken"
        );
        setUsernameMessage(cached.error || "");
        return;
      }
      try {
        setUsernameStatus("checking");
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        const res = await axios.get(
          `${BACKEND_URL}/api/auth/check-username`,
          {
            params: { username },
            signal: controller.signal,
          }
        );

        usernameCache.current.set(username, res.data);

        if (res.data.available) {
          setUsernameStatus("available");
          setUsernameMessage("");
        } else {
          setUsernameStatus("taken");
          setUsernameMessage(res.data.error);
        }

      } catch (err) {
        if (axios.isCancel(err)) return;
        console.error(err);
        setUsernameStatus("idle");
      }

    }, 500);

    return () => clearTimeout(timeout);

  }, [form.username, BACKEND_URL, user]);
  return (
    <div className="fixed inset-0 z-[100] bg-[#5b7083]/40 backdrop-blur-[2px] flex items-center justify-center p-4">

      {/* CROPPER OVERLAY - This shows up when an image is picked */}
      {editingImage && (
        <div className="absolute inset-0 z-[110] bg-black flex flex-col">
          <div className="flex items-center justify-between p-4 bg-black z-20">
            <button onClick={() => setEditingImage(null)} className="text-white"><X /></button>
            <h2 className="text-white font-bold">Edit Media</h2>
            <button onClick={applyCrop} className="bg-white text-black px-4 py-1 rounded-full font-bold">Apply</button>
          </div>
          <div className="relative flex-1 bg-[#191919]">
            <Cropper
              image={editingImage.url}
              crop={crop}
              zoom={zoom}
              aspect={editingImage.type === 'banner' ? 3 / 1 : 1 / 1}
              cropShape={editingImage.type === 'avatar' ? 'round' : 'rect'}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="p-8 bg-black">
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      )}

      <div className="bg-black w-full max-w-[600px] h-full max-h-[90vh] rounded-2xl overflow-hidden flex flex-col border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-white/10">
          <div className="flex items-center gap-8">
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
            <h2 className="text-xl font-bold text-white">Edit profile</h2>
          </div>
          <button
            onClick={saveProfile}
            disabled={
              isSaving ||
              usernameStatus === "checking" ||
              usernameStatus === "taken"
            }
            className="bg-white text-black px-4 py-1.5 rounded-full font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[70px] text-center"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Banner */}
          <div className="relative mb-20">
            <div className="h-40 bg-zinc-800 relative">
              {form.banner && <img src={form.banner} className="w-full h-full object-cover" alt="Banner" />}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <button onClick={() => bannerInputRef.current?.click()} className="p-3 bg-black/50 rounded-full hover:bg-black/70 border border-white/20">
                  <Camera className="text-white w-6 h-6" />
                </button>
              </div>
              <input type="file" ref={bannerInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
            </div>

            {/* Avatar */}
            <div className="absolute -bottom-16 left-4">
              <div className="w-32 h-32 rounded-full border-4 border-black bg-zinc-900 overflow-hidden relative">
                {form.avatar && <img src={form.avatar} className="w-full h-full object-cover" alt="Avatar" />}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <button onClick={() => avatarInputRef.current?.click()} className="p-2 bg-black/50 rounded-full hover:bg-black/70 border border-white/20">
                    <Camera className="text-white w-5 h-5" />
                  </button>
                </div>
              </div>
              <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
            </div>
          </div>

          {/* Rest of the Fields (Same as before) */}
          <div className="p-4 pt-0 space-y-6">
            {/* Display Name */}
            <div className="group border border-zinc-800 rounded p-2 focus-within:border-blue-500">
              <label className="text-xs text-zinc-500">Display Name</label>
              <input
                type="text"
                value={form.displayName || ''}
                onChange={e => setForm({ ...form, displayName: e.target.value })}
                maxLength={30}
                className="w-full bg-transparent text-white outline-none pt-1"
              />
            </div>

            {/* Username */}
            <div className="group border border-zinc-800 rounded p-2 focus-within:border-blue-500">
              <label className="text-xs text-zinc-500">Username</label>

              <input
                type="text"
                value={form.username || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    username: e.target.value.toLowerCase(),
                  })
                }
                className="w-full bg-transparent text-white outline-none pt-1"
              />

              {usernameStatus === "checking" && (
                <p className="text-xs text-zinc-500 mt-1">
                  Checking username...
                </p>
              )}

              {usernameStatus === "available" && (
                <p className="text-xs text-green-500 mt-1">
                  Username available ✓
                </p>
              )}

              {usernameStatus === "taken" && (
                <p className="text-xs text-red-500 mt-1">
                  {usernameMessage}
                </p>
              )}
            </div>

            {/* Bio */}
            <div className="group border border-zinc-800 rounded p-2 focus-within:border-blue-500">
              <label className="text-xs text-zinc-500">Bio</label>
              <textarea
                rows={3}
                value={form.bio || ''}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                maxLength={160}
                className="w-full bg-transparent text-white outline-none pt-1 resize-none"
              />
            </div>

            {/* Location */}
            <div className="group border border-zinc-800 rounded p-2 focus-within:border-blue-500">
              <label className="text-xs text-zinc-500">Location</label>
              <input
                type="text"
                value={form.location || ''}
                onChange={e => setForm({ ...form, location: e.target.value })}
                maxLength={100}
                className="w-full bg-transparent text-white outline-none pt-1"
              />
            </div>

            {/* Website */}
            <div className="group border border-zinc-800 rounded p-2 focus-within:border-blue-500">
              <label className="text-xs text-zinc-500">Website</label>
              <input
                type="url"
                value={form.website || ''}
                onChange={e => setForm({ ...form, website: e.target.value })}
                className="w-full bg-transparent text-white outline-none pt-1"
              />
            </div>

            {/* Birth Date */}
            <div className="group border border-zinc-800 rounded p-2 focus-within:border-blue-500">
              <label className="text-xs text-zinc-500 block">Birth Date</label>
              <input
                type="date"
                value={form.birthDate || ''}
                onChange={e => setForm({ ...form, birthDate: e.target.value })}
                className="w-full bg-transparent text-white outline-none pt-1 [color-scheme:dark]"
              />
            </div>

            {/* Job Title */}
            <div className="group border border-zinc-800 rounded p-2 focus-within:border-blue-500 pb-4">
              <label className="text-xs text-zinc-500">Job Title</label>
              <input
                type="text"
                value={form.jobTitle || ''}
                onChange={e => setForm({ ...form, jobTitle: e.target.value })}
                maxLength={100}
                className="w-full bg-transparent text-white outline-none pt-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;