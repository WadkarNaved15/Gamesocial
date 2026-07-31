import { useState, useRef, MouseEvent as ReactMouseEvent } from "react";
import {
    X,
    Loader2,
    MessageSquare,
    Star,
} from "lucide-react";
import { useQueue } from "../../context/QueueContext";

interface Props {
    open: boolean;
    onClose: () => void;
    gameName: string;
    steamUrl?: string | null;
    playTimeMs: number;
}

export default function GameFeedbackModal({
    open,
    onClose,
    gameName,
    steamUrl,
    playTimeMs,
}: Props) {
    const FEEDBACK_STORAGE_KEY = "rigzer_feedback_session";
    const { feedback, setFeedback, clearSession } = useQueue();
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const [form, setForm] = useState({
        overall: 0, // Scale 1 to 10
        comment: "",
    });
    const totalMinutes = Math.floor(playTimeMs / 60000);
    const totalSeconds = Math.floor((playTimeMs % 60000) / 1000);

    const playTimeText =
        totalMinutes > 0
            ? `${totalMinutes} min${totalMinutes > 1 ? "s" : ""} ${totalSeconds} sec`
            : `${totalSeconds} sec`;

    if (!open) return null;

    const handleCloseAction = () => {
        localStorage.removeItem(FEEDBACK_STORAGE_KEY);
        setFeedback({
            open: false,
            sessionId: null,
            gameId: null,
            gameName: null,
            steamUrl: null,
            playTimeMs: null,
        });
        clearSession();
        onClose();
    };

    // Helper to calculate rating based on pointer coordinates over the 10 bars
    const calculateRating = (clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const relativeX = clientX - rect.left;
        // Divide width into 10 sections, clamp between 1 and 10
        const percentage = relativeX / rect.width;
        const rating = Math.ceil(percentage * 10);
        return Math.max(1, Math.min(10, rating));
    };

    const submit = async () => {
        if (form.overall === 0) {
            alert("Please provide a rating by selecting one of the bars.");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/game-feedback`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        sessionId: feedback.sessionId,
                        overall: form.overall,
                        suggestions: form.comment,
                    }),
                }
            );

            if (!res.ok) throw new Error("Failed to submit feedback");
            handleCloseAction();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl flex flex-col relative select-none">

                {/* Close Button */}
                <button
                    onClick={handleCloseAction}
                    className="absolute top-5 right-5 p-1 text-zinc-400 hover:text-zinc-600 transition"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-zinc-900">
                        Rate Your Session
                    </h2>
                    {/* Updated game name styles for better visibility */}
                    <p className="text-lg font-bold text-zinc-700 mt-1">
                        {gameName}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[15px] font-bold tracking-wide shrink-0 text-teal-600 dark:text-[#62d4ae]">
                        Played {playTimeText}
                    </span>
                    {steamUrl && (
                        <a
                            href={steamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 mx-auto flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02] hover:bg-gray-100/80 dark:hover:bg-white/[0.05] transition-colors group w-fit"
                        >
                            <img
                                src="/steamLogo.png"
                                alt="Steam"
                                className="h-12 w-12 object-contain flex-shrink-0 opacity-80 dark:invert group-hover:opacity-100 transition-opacity"
                            />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors">
                                View on Steam
                            </span>
                        </a>
                    )}
                </div>

                {/* Form Body */}
                <div className="space-y-6">

                    {/* Star Rating Section */}
                    <div className="flex flex-col items-center justify-center gap-3 py-2">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-zinc-900">
                                {form.overall || "-"}
                            </span>
                            <span className="text-xs font-semibold text-zinc-400 bottom-0.5 relative">
                                /10 Rating
                            </span>
                        </div>

                        {/* 10 Star Rating Container */}
                        <div
                            className="flex items-center gap-1 sm:gap-1.5"
                            onMouseLeave={() => setIsDragging(false)}
                        >
                            {Array.from({ length: 10 }).map((_, index) => {
                                const ratingValue = index + 1;
                                const isFilled = ratingValue <= form.overall;

                                return (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => setForm((prev) => ({ ...prev, overall: ratingValue }))}
                                        onMouseEnter={() => setForm((prev) => ({ ...prev, overall: ratingValue }))}
                                        className="p-0.5 focus:outline-none transition-transform hover:scale-125"
                                    >
                                        <Star
                                            size={22}
                                            className={`transition-colors duration-150 ${isFilled
                                                ? "fill-amber-400 text-amber-400"
                                                : "fill-zinc-100 text-zinc-300 hover:text-amber-300"
                                                }`}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Single Feedback Comment Box */}
                    <div>
                        <textarea
                            rows={4}
                            placeholder="this will appear in comments..."
                            value={form.comment}
                            onChange={(e) => setForm({ ...form, comment: e.target.value })}
                            className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-3.5 text-sm text-zinc-900 placeholder-zinc-400 resize-none focus:outline-none focus:border-zinc-400 focus:bg-white transition duration-200"
                        />
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleCloseAction}
                        className="px-4 py-2 text-zinc-500 hover:text-zinc-700 font-medium text-sm transition duration-150"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={loading}
                        className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white text-sm font-medium flex items-center gap-2 transition duration-150 disabled:pointer-events-none"
                    >
                        {loading && <Loader2 size={14} className="animate-spin" />}
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
}