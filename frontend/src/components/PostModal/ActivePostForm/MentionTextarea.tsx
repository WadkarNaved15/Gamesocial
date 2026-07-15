import React, { useEffect, useRef } from "react";
import { MentionProps, User, Coordinates } from "../../../types/mention";
import { useMentions } from "../../../hooks/useMentions";
import { createPortal } from "react-dom";

// ==========================================
// 1. Mention Item Component
// ==========================================
interface MentionItemProps {
  user: User;
  isActive: boolean;
  onClick: (user: User) => void;
  onMouseEnter: () => void;
}

const MentionItem: React.FC<MentionItemProps> = ({ user, isActive, onClick, onMouseEnter }) => {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick(user);
      }}
      className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
        isActive ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-gray-50 dark:hover:bg-gray-800"
      }`}
    >
      <img
        src={user.avatar || "/default-avatar.png"}
        alt={user.username}
        className="w-8 h-8 rounded-full object-cover bg-gray-200"
        onError={(e) => {
          e.currentTarget.src = "/default-avatar.png";
        }}
      />
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {user.displayName}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          @{user.username}
        </span>
      </div>
    </div>
  );
};

// ==========================================
// 2. Mention Dropdown Component
// ==========================================
interface MentionDropdownProps {
  isOpen: boolean;
  suggestions: User[];
  activeIndex: number;
  coords: Coordinates | null;
  onSelect: (user: User) => void;
  onHover: (index: number) => void;
  onClose: () => void;
}

const MentionDropdown: React.FC<MentionDropdownProps> = ({
  isOpen,
  suggestions,
  activeIndex,
  coords,
  onSelect,
  onHover,
  onClose,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("Rendering mention dropdown...");
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || suggestions.length === 0 || !coords) return null;

  // ARCHITECTURAL CHANGE: Renders out to `document.body` via portal and tracks purely by fixed positioning.
  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] w-64 max-h-64 overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-100 dark:border-gray-800 custom-scrollbar"
      style={{
        top: coords.top,
        left: coords.left,
      }}
    >
      {suggestions.map((user, index) => (
        <MentionItem
          key={user._id}
          user={user}
          isActive={index === activeIndex}
          onClick={onSelect}
          onMouseEnter={() => onHover(index)}
        />
      ))}
    </div>,
    document.body 
  );
};

// ==========================================
// 3. Main Textarea Component
// ==========================================
export const MentionTextarea: React.FC<MentionProps> = ({
  value,
  onChange,
  placeholder = "Type here...",
  rows = 4,
  className = "",
  disabled = false,
  maxLength,
  onMentionSelected,
  onMentionStarted,
  onMentionClosed,
  onMentionsChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isOpen,
    suggestions,
    activeIndex,
    coords,
    closeDropdown,
    handleSelectionChange,
    handleKeyDown,
    insertMention,
    setActiveIndex,
    selectedMentions,
  } = useMentions(value, onChange, textareaRef, {
    onMentionSelected,
    onMentionStarted,
    onMentionClosed,
  });

  useEffect(() => {
  console.log("Rendering selected mentions...");
  onMentionsChange?.(selectedMentions);
}, [selectedMentions, onMentionsChange]);

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          handleSelectionChange();
        }}
        onKeyUp={handleSelectionChange}
        onClick={handleSelectionChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        maxLength={maxLength}
        className={`${className}`}
      />

      <MentionDropdown
        isOpen={isOpen}
        suggestions={suggestions}
        activeIndex={activeIndex}
        coords={coords}
        onSelect={insertMention}
        onHover={setActiveIndex}
        onClose={closeDropdown}
      />
    </div>
  );
};