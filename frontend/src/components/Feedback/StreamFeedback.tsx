import { useState } from "react";
import { X, Loader2, WifiOff, Cpu, AlertTriangle, HelpCircle } from "lucide-react";
import { useQueue } from "../../context/QueueContext";
import Logo from "../../assets/Icon.svg?react";

interface Props {
    streamId?: string | null;
    streamForm: {
        issues: string[];
    };

    setStreamForm: React.Dispatch<
        React.SetStateAction<{
            issues: string[];
        }>
    >;
}

const ISSUE_OPTIONS = [
    { id: "connection_lost", label: "Connection lost", icon: WifiOff },
    { id: "lag_stutter", label: "Lag / Stutter in performance", icon: Cpu },
    { id: "waiting_issues", label: "Waiting time", icon: AlertTriangle },
    { id: "other", label: "Other issue", icon: HelpCircle },
];

export default function StreamFeedbackModal({ streamId, streamForm, setStreamForm, }: Props) {
    const { clearSession } = useQueue();

    const toggleIssue = (id: string) => {
        setStreamForm(prev => ({
            ...prev,
            issues: prev.issues.includes(id)
                ? prev.issues.filter(i => i !== id)
                : [...prev.issues, id],
        }));
    };

    const handleCloseAction = () => {
        setStreamForm({ issues: [] });
        clearSession();

    };


    return (
        <div className="w-full max-w-md rounded-2xl bg-zinc-700/80 border border-zinc-700/50 p-6 shadow-2xl flex flex-col relative select-none">
            {/* Close Button */}
            {/* <button
                onClick={handleCloseAction}
                className="absolute top-5 right-5 p-1 text-zinc-300 hover:text-white transition"
            >
                <X size={20} />
            </button> */}

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
                            const isSelected = streamForm.issues.includes(issue.id);

                            return (
                                <button
                                    key={issue.id}
                                    type="button"
                                    onClick={() => toggleIssue(issue.id)}
                                    className={`flex flex-col sm:flex-row items-center sm:items-start gap-2.5 p-3 rounded-xl text-xs sm:text-sm font-medium border transition-all text-center sm:text-left ${isSelected
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
        </div>
    );
}