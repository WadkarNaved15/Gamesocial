import React, { useState, useEffect, useRef } from "react";

// Define the props interface for the component
interface AutoWidthInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  spanClassName?: string;
  minWidth?: number | string;
  padding?: number;
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
  const [width, setWidth] = useState<number | string>(minWidth);

  useEffect(() => {
    if (spanRef.current) {
      const textWidth = spanRef.current.offsetWidth + padding;

      if (typeof minWidth === "number") {
        // px-based logic
        setWidth(Math.max(textWidth, minWidth));
      } else {
        // % or other string-based minWidth → keep string
        setWidth(textWidth < 1 ? minWidth : textWidth);
      }
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
};

export default AutoWidthInput;