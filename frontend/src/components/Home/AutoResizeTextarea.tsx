import React, { useRef, useEffect } from "react";

// Define the props interface for the component
interface AutoResizeTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({ value, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Ensure the ref is available before accessing its properties
    if (textareaRef.current) {
      // Reset height to 'auto' to correctly calculate scrollHeight when content shrinks
      textareaRef.current.style.height = "auto";
      // Set the height to the scrollHeight, which represents the content's natural height
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [value]); // Re-run effect when the 'value' prop changes

  return (
    <textarea
      ref={textareaRef}
      className="text-xl text-slate-300 bg-transparent outline-none w-full resize-none overflow-hidden"
      value={value}
      onChange={onChange}
    />
  );
};

export default AutoResizeTextarea;