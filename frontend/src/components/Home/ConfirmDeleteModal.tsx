import React from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDeleteModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    loading?: boolean;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
    open,
    onClose,
    onConfirm,
    loading,
}) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white dark:bg-[#191919] shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                        <AlertTriangle className="text-red-500" size={28} />
                    </div>

                    <h2 className="text-xl font-black text-gray-900 dark:text-white">
                        Delete Post?
                    </h2>

                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        This action cannot be undone.
                        The post will be permanently removed.
                    </p>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 p-4 border-t border-gray-200 dark:border-white/10">

                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="h-12 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white font-bold transition-all"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all active:scale-95"
                    >
                        {loading ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;