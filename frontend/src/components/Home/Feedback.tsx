import { useState } from "react";
import { FaTimes, FaRegCommentDots } from "react-icons/fa";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const [category, setCategory] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!category || !feedback.trim()) {
      setError("Please select a category and write your feedback.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          category,
          message: feedback.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setSuccess("Feedback submitted successfully!");
        setCategory("");
        setFeedback("");
        setTimeout(() => {
          onClose();
          setSuccess("");
        }, 1200);
      }
    } catch (err) {
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Backdrop blur (keeps background readable but soft)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      
      {/* Main Glassmorphic Card with the rich green gradient */}
      <div className="relative w-full max-w-lg mx-4 overflow-hidden rounded-2xl p-7 text-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)]">
        
        {/* 
          Gradient + Frosted Layer:
          1. Sets the rich green/teal gradient from the previous theme.
          2. Reduces opacity slightly (/80).
          3. Applies heavy backdrop blur for the glass effect.
        */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#0A1714]/80 via-[#1F4D44]/80 to-[#3D7A6E]/80 backdrop-blur-xl" />

        {/* 
          Double Border "Light" Refraction effect:
          - An outer very thin faint white border.
          - An inner pseudo-element with a top-down light gradient to simulate edge catching light.
        */}
        <div className="absolute inset-0 z-10 border border-white/[0.08] rounded-2xl pointer-events-none
                        before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b 
                        before:from-white/[0.05] before:to-transparent before:-z-10" />

        {/* Content (Set relative and z-20 to sit above the glass layer) */}
        <div className="relative z-20">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-0 right-0 text-gray-300 hover:text-red-400 transition-colors duration-200 p-1.5 rounded-lg hover:bg-white/[0.05]"
            aria-label="Close modal"
          >
            <FaTimes size={18} />
          </button>

          {/* Header Section */}
          <div className="flex items-start gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">Give Feedback</h2>
            </div>
          </div>

          <p className="text-sm text-gray-100 mb-6 leading-relaxed">
            Help us improve by sharing your thoughts. You can suggest features, report bugs, or just tell us what you think.
          </p>

          {/* Alert Messages */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm backdrop-blur-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm backdrop-blur-sm">
              {success}
            </div>
          )}

          {/* Category Select */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-200 uppercase tracking-wider mb-2">
              Category
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 rounded-xl bg-black/30 border border-white/[0.08] 
                          focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 text-white text-sm 
                          outline-none transition-all duration-200 cursor-pointer appearance-none shadow-inner"
                style={{ 
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23d1d5db' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, 
                  backgroundPosition: 'right 16px center', 
                  backgroundSize: '16px', 
                  backgroundRepeat: 'no-repeat' 
                }}
              >
                {/* Keep native option backgrounds dark for readability */}
                <option value="" className="bg-[#0A1714]">Select a category</option>
                <option value="Feature Request" className="bg-[#0A1714]">Suggestions</option>
                <option value="Bug Report" className="bg-[#0A1714]">Bug Report</option>
                <option value="Purchase and Payment Issue" className="bg-[#0A1714]">Purchase & Payment Issue</option>
                <option value="Other" className="bg-[#0A1714]">Other</option>
              </select>
            </div>
          </div>

          {/* Feedback Textarea */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-200 uppercase tracking-wider mb-2">
              Your Message
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe your issue or suggestion in detail..."
              className="w-full h-32 p-3.5 rounded-xl bg-black/30 border border-white/[0.08] 
                        focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 text-white text-sm 
                        resize-none outline-none transition-all duration-200 placeholder-gray-400 
                        leading-relaxed shadow-inner"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-white/[0.08] text-gray-200 font-medium
                        hover:bg-white/[0.05] hover:text-white transition-all duration-200 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold 
                        shadow-[0_4px_20px_rgba(239,68,68,0.3)] hover:brightness-110 active:scale-[0.98] 
                        transition-all duration-200 text-sm disabled:opacity-40 disabled:pointer-events-none"
            >
              {loading ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}