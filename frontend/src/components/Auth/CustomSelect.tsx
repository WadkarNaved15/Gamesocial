import React, { useState, useEffect, useRef } from 'react';

// Custom Select Component for exact control over height and direction
export const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder,
  error
}: {
  value: string | number;
  onChange: (val: string) => void;
  options: { val: string | number; name: string | number }[];
  placeholder: string;
  error?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.val.toString() === value.toString());

  return (
    <div className="relative w-1/3" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2.5 flex items-center justify-between bg-white/5 border rounded-lg text-sm focus:outline-none transition-colors ${error
            ? 'border-red-500/40 text-white'
            : isOpen
              ? 'border-[#62D4AE]/50 text-white'
              : 'border-white/10 text-white'
          } ${!selectedOption ? 'text-white/50' : ''}`}
      >
        <span className="truncate">{selectedOption ? selectedOption.name : placeholder}</span>
        <svg className={`w-4 h-4 transition-transform text-white/40 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#0f1311] border border-white/10 rounded-lg shadow-xl overflow-hidden">
          <ul className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
            {options.map((opt) => (
              <li
                key={opt.val}
                onClick={() => {
                  onChange(opt.val.toString());
                  setIsOpen(false);
                }}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors ${value.toString() === opt.val.toString()
                    ? 'bg-[#62D4AE]/20 text-[#62D4AE]'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
              >
                {opt.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;