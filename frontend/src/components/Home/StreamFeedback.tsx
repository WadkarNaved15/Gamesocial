import { useState } from "react";
import { X, Loader2, WifiOff, Cpu, AlertTriangle, HelpCircle } from "lucide-react";
import { useQueue } from "../../context/QueueContext";
import Logo from "../../assets/Icon.svg?react";

interface Props {
    open: boolean;
    onClose: () => void;
    streamId?: string | null;
}

const ISSUE_OPTIONS = [
    { id: "connection_lost", label: "Connection lost", icon: WifiOff },
    { id: "lag_stutter", label: "Lag / Stutter in performance", icon: Cpu },
    { id: "audio_issues", label: "Audio out of sync / missing", icon: AlertTriangle },
    { id: "other", label: "Other issue", icon: HelpCircle },
];

export default function StreamFeedbackModal({ open, onClose, streamId }: Props) {
    const { clearSession } = useQueue();
    const [loading, setLoading] = useState(false);
    const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
    const [comment, setComment] = useState("");

    if (!open) return null;

    const toggleIssue = (id: string) => {
        setSelectedIssues((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const handleCloseAction = () => {
        setSelectedIssues([]);
        setComment("");
        clearSession();
        onClose();
    };

    const submit = async () => {
        if (selectedIssues.length === 0 && !comment.trim()) {
            alert("Please select at least one issue or write a brief comment.");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/stream-feedback`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        streamId,
                        issues: selectedIssues,
                        comment: comment.trim(),
                    }),
                }
            );

            if (!res.ok) throw new Error("Failed to submit stream feedback");
            handleCloseAction();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-emerald-900/40 p-6 shadow-2xl flex flex-col relative select-none">
                
                {/* Close Button */}
                <button
                    onClick={handleCloseAction}
                    className="absolute top-5 right-5 p-1 text-zinc-400 hover:text-white transition"
                >
                    <X size={20} />
                </button>

                {/* Header with Rigzer Logo */}
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="mb-3 p-3 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-zinc-900 border border-emerald-500/20 shadow-inner">
                        <Logo className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                        Stream Quality Feedback
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1">
                        Did something go wrong during your stream? Let us know.
                    </p>
                </div>

                {/* Form Body */}
                <div className="space-y-5">
                    
                    {/* Issue Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
                            What went wrong?
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {ISSUE_OPTIONS.map((issue) => {
                                const Icon = issue.icon;
                                const isSelected = selectedIssues.includes(issue.id);

                                return (
                                    <button
                                        key={issue.id}
                                        type="button"
                                        onClick={() => toggleIssue(issue.id)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border transition-all text-left ${
                                            isSelected
                                                ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-300 shadow-sm"
                                                : "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                                        }`}
                                    >
                                        <Icon
                                            size={18}
                                            className={isSelected ? "text-emerald-400" : "text-zinc-400"}
                                        />
                                        <span>{issue.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Comment Area */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                            Additional details (Optional)
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Describe what happened or add details..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full rounded-xl bg-zinc-900/80 border border-zinc-800 p-3.5 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:border-emerald-500/60 transition duration-200"
                        />
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleCloseAction}
                        className="px-4 py-2 text-zinc-400 hover:text-zinc-200 font-medium text-sm transition duration-150"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={loading}
                        className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-500 font-semibold text-sm flex items-center gap-2 transition duration-150 disabled:pointer-events-none shadow-md shadow-emerald-950/20"
                    >
                        {loading && <Loader2 size={14} className="animate-spin" />}
                        Submit Feedback
                    </button>
                </div>
            </div>
        </div>
    );
}