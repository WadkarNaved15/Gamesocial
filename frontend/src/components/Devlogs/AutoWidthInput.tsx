import React, { useState, useEffect, useRef } from "react";

// Define the props interface for the component
interface AutoWidthInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string; // custom classes
  spanClassName?: string; // custom classes for measuring span (for font consistency)
  minWidth?: number; // optional minimum width
  padding?: number; // optional padding to add
}

const AutoWidthInput: React.FC<AutoWidthInputProps> = ({
  value,
  onChange,
  className = "",
  spanClassName = "",
  minWidth = 20,
  padding = 20,
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(minWidth);

  useEffect(() => {
    if (spanRef.current) {
      setWidth(Math.max(spanRef.current.offsetWidth + padding, minWidth));
    }
  }, [value, padding, minWidth]);

  return (
    <div className="inline-block relative">
      {/* Hidden span to measure text width */}
      <span
        ref={spanRef}
        className={`absolute invisible whitespace-pre ${spanClassName}`}
      >
        {value || " "}
      </span>

      <input
        type="text"
        className={className}
        value={value}
        onChange={onChange}
        style={{ width }}
      />
    </div>
  );
}

export default AutoWidthInput;