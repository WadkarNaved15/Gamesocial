import { useState, useRef, MouseEvent as ReactMouseEvent } from "react";
import {
    X,
    Loader2,
    MessageSquare,
} from "lucide-react";
import { useQueue } from "../../context/QueueContext";

interface Props {
    open: boolean;
    onClose: () => void;
    gameName: string;
    playTimeMs: number;
}

export default function GameFeedbackModal({
    open,
    onClose,
    gameName,
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

    const handlePointerDown = (e: ReactMouseEvent<HTMLDivElement>) => {
        const rating = calculateRating(e.clientX);
        if (rating !== undefined) {
            setForm((prev) => ({ ...prev, overall: rating }));
        }
        setIsDragging(true);
    };

    const handlePointerMove = (e: ReactMouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        const rating = calculateRating(e.clientX);
        if (rating !== undefined) {
            setForm((prev) => ({ ...prev, overall: rating }));
        }
    };

    const handlePointerUpOrLeave = () => {
        setIsDragging(false);
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

    // 10 distinct bar heights scaled to look organic matching a maximum height of ~82px
    // Starts small at 14px, climbing smoothly by 4-5px per step up to 52px
    const waveHeights = [14, 18, 22, 27, 31, 36, 40, 44, 48, 52];

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
                    <p className="text-sm text-zinc-500 mt-1">
                        You played for <span className="font-semibold">{playTimeText}</span>
                    </p>
                </div>

                {/* Form Body */}
                <div className="space-y-6">

                    {/* Voice Note Waveform Rating */}
                    <div className="flex flex-col items-center justify-center gap-3 py-2">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-zinc-900">
                                {form.overall || "-"}
                            </span>
                            <span className="text-xs font-semibold text-zinc-400 bottom-0.5 relative">
                                /10 Rating
                            </span>
                        </div>

                        {/* Waveform Container - set to explicit h-[90px] */}
                        <div
                            ref={containerRef}
                            onMouseDown={handlePointerDown}
                            onMouseMove={handlePointerMove}
                            onMouseUp={handlePointerUpOrLeave}
                            onMouseLeave={handlePointerUpOrLeave}
                            className="flex items-center justify-between w-full max-w-[280px] h-[90px] px-2 cursor-pointer overview-resize group/wave"
                        >
                            {waveHeights.map((height, index) => {
                                const barValue = index + 1;
                                const isActive = barValue <= form.overall;
                                return (
                                    <div
                                        key={index}
                                        style={{ height: `${height}px` }}
                                        className={`w-2.5 rounded-full transition-all duration-150 origin-center ${isActive
                                            ? "bg-emerald-500 scale-y-105"
                                            : "bg-zinc-200 group-hover/wave:bg-zinc-300"
                                            }`}
                                    />
                                );
                            })}
                        </div>
                        <p className="text-xs text-zinc-400">Click or drag across the waveform to rate</p>
                    </div>

                    {/* Single Feedback Comment Box */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-600 mb-2">
                            <MessageSquare size={16} className="text-zinc-400" />
                            Your Comments
                        </label>
                        <textarea
                            rows={4}
                            placeholder="Tell us about your experience..."
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