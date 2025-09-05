import { useState } from "react";
import { FaTimes } from "react-icons/fa";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (category: string, feedback: string) => void;
}

export default function FeedbackModal({ isOpen, onClose, onSubmit }: FeedbackModalProps) {
  const [category, setCategory] = useState("");
  const [feedback, setFeedback] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!category || !feedback.trim()) return;
    onSubmit(category, feedback);
    setCategory("");
    setFeedback("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-b from-[#0A1714] via-[#1F4D44] to-[#3D7A6E] 
                      text-white w-full max-w-lg rounded-xl shadow-2xl p-6 relative">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-red-400 transition"
        >
          <FaTimes size={18} />
        </button>

        {/* Header */}
        <h2 className="text-xl font-semibold mb-2">Give Feedback</h2>
        <p className="text-sm text-gray-200 mb-4">
          Help us improve by sharing your thoughts. You can suggest features, report issues,
          or just tell us what you think about the app.
        </p>

        {/* Category Select */}
        <label className="block text-sm font-medium mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 rounded-lg bg-[#0A1714]/80 border border-gray-500 
                     focus:ring-2 focus:ring-red-500 text-white text-sm mb-4"
        >
          <option value="">Please select a category</option>
          <option value="feature">Feature Request</option>
          <option value="bug">Bug Report</option>
          <option value="ui">UI/UX Feedback</option>
          <option value="other">Other</option>
        </select>

        {/* Feedback textarea */}
        <label className="block text-sm font-medium mb-1">Feedback</label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Write your feedback here..."
          className="w-full h-28 p-3 rounded-lg bg-[#0A1714]/80 border border-gray-500 
                     focus:ring-2 focus:ring-red-500 text-white text-sm resize-none mb-6"
        />

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-500 
                       hover:bg-gray-700/50 transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium 
                       hover:bg-red-600 transition text-sm"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
