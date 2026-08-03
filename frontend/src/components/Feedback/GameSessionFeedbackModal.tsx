import GameFeedbackPanel from "./GameFeedbackModal";
import StreamFeedbackPanel from "./StreamFeedback";
import { useQueue } from "../../context/QueueContext";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
    open: boolean;
    onClose: () => void;
    gameName: string;
    steamUrl?: string | null;
    playTimeMs: number;
}

export default function GameSessionFeedbackModal({
    open,
    onClose,
    gameName,
    steamUrl,
    playTimeMs,
}: Props) {
    const [gameForm, setGameForm] = useState({
        overall: 0,
        comment: "",
    });
    const [streamForm, setStreamForm] = useState({
        issues: [] as string[],
    });
    const FEEDBACK_STORAGE_KEY = "rigzer_feedback_session";
    const { feedback, setFeedback, clearSession } = useQueue();
    const [loading, setLoading] = useState(false);
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
    const handleSubmit = async () => {
        if (gameForm.overall === 0) {
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
                        overall: gameForm.overall,
                        suggestions: gameForm.comment,
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-6">

            <div className="flex flex-col gap-6">

                <div className="flex flex-col lg:flex-row gap-6 items-start">

                    <StreamFeedbackPanel
                        streamForm={streamForm}
                        setStreamForm={setStreamForm}
                    />

                    <GameFeedbackPanel
                        onClose={onClose}
                        gameName={gameName}
                        steamUrl={steamUrl}
                        playTimeMs={playTimeMs}
                        gameForm={gameForm}
                        setGameForm={setGameForm}
                    />

                </div>

                <div className="flex justify-end gap-3">

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-zinc-300 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 rounded-xl bg-gray-600 hover:bg-gray-500 disabled:bg-zinc-500 text-white font-medium flex items-center gap-2"
                    >
                        {loading && (
                            <p className="animate-spin"><Loader2 size={16} /></p>
                        )}
                        Submit Feedback
                    </button>
                </div>
            </div>
        </div>
    );
}