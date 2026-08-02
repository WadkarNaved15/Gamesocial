import { useState, useRef, MouseEvent as ReactMouseEvent } from "react";
import {
    X,
    Loader2,
    MessageSquare,
    Star,
} from "lucide-react";
import { useQueue } from "../../context/QueueContext";

interface Props {
    onClose: () => void;
    gameName: string;
    steamUrl?: string | null;
    playTimeMs: number;
    gameForm: {
        overall: number;
        comment: string;
    };

    setGameForm: React.Dispatch<
        React.SetStateAction<{
            overall: number;
            comment: string;
        }>
    >;
}

export default function GameFeedbackModal({
    onClose,
    gameName,
    steamUrl,
    playTimeMs,
    gameForm,
    setGameForm,
}: Props) {
    const FEEDBACK_STORAGE_KEY = "rigzer_feedback_session";
    const { feedback, setFeedback, clearSession } = useQueue();
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const totalMinutes = Math.floor(playTimeMs / 60000);
    const totalSeconds = Math.floor((playTimeMs % 60000) / 1000);

    const playTimeText =
        totalMinutes > 0
            ? `${totalMinutes} min${totalMinutes > 1 ? "s" : ""} ${totalSeconds} sec`
            : `${totalSeconds} sec`;


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
    
    return (
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl flex flex-col relative select-none">

                {/* Close Button */}
                <button
                    onClick={onClose}
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
                                {gameForm.overall || "-"}
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
                                const isFilled = ratingValue <= gameForm.overall;

                                return (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => setGameForm((prev) => ({ ...prev, overall: ratingValue }))}
                                        onMouseEnter={() => setGameForm((prev) => ({ ...prev, overall: ratingValue }))}
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
                            value={gameForm.comment}
                            onChange={(e) => setGameForm({ ...gameForm, comment: e.target.value })}
                            className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-3.5 text-sm text-zinc-900 placeholder-zinc-400 resize-none focus:outline-none focus:border-zinc-400 focus:bg-white transition duration-200"
                        />
                    </div>
                </div>
            </div>
    );
}