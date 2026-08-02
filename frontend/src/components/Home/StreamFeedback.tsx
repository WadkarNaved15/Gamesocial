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
    { id: "waiting_issues", label: "Waiting time", icon: AlertTriangle },
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
            {/* Main glassmorphism modal card */}
            <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 p-6 shadow-2xl flex flex-col relative select-none">
                
                {/* Close Button */}
                <button
                    onClick={handleCloseAction}
                    className="absolute top-5 right-5 p-1 text-zinc-300 hover:text-white transition"
                >
                    <X size={20} />
                </button>

                {/* Header with Logo */}
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="mb-3">
                        <Logo className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                        Stream Quality Feedback
                    </h2>
                </div>

                {/* Form Body */}
                <div className="space-y-5">
                    
                    {/* Issue Selection Grid */}
                    <div>
                        <div className="grid grid-cols-2 gap-2.5">
                            {ISSUE_OPTIONS.map((issue) => {
                                const Icon = issue.icon;
                                const isSelected = selectedIssues.includes(issue.id);

                                return (
                                    <button
                                        key={issue.id}
                                        type="button"
                                        onClick={() => toggleIssue(issue.id)}
                                        className={`flex flex-col sm:flex-row items-center sm:items-start gap-2.5 p-3 rounded-xl text-xs sm:text-sm font-medium border transition-all text-center sm:text-left ${
                                            isSelected
                                                ? "bg-white/20 border-white/30 text-white shadow-sm"
                                                : "bg-zinc-800/40 border-white/5 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800/60"
                                        }`}
                                    >
                                        <Icon
                                            size={18}
                                            className={`shrink-0 ${isSelected ? "text-white" : "text-zinc-300"}`}
                                        />
                                        <span className="leading-tight">{issue.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleCloseAction}
                        className="px-4 py-2 text-zinc-300 hover:text-zinc-100 font-medium text-sm transition duration-150"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}