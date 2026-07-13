import { useState, useEffect, useLayoutEffect, useRef, KeyboardEvent } from "react";
import axios from "axios";
import { User, Coordinates } from "../types/mention";
import { getActiveMention, getCaretCoordinates, replaceMention } from "../utils/mentionParser";

const INTERACT_USER: User = {
  _id: "interact-special-id",
  username: "interact",
  displayName: "Interact",
  avatar: "/interact-avatar.png",
};

export const useMentions = (
  value: string,
  onChange: (val: string) => void,
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  callbacks?: {
    onMentionSelected?: (user: User) => void;
    onMentionStarted?: () => void;
    onMentionClosed?: () => void;
  }
) => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [selectedMentions, setSelectedMentions] = useState<User[]>([]);

  const cache = useRef<Record<string, User[]>>({});
  const cancelToken = useRef<import("axios").CancelTokenSource | null>(null);
  
  // ARCHITECTURAL CHANGE: Track the START of the mention instead of the moving cursor
  const mentionStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const updateCoords = () => {
    // Abort if we don't have an active mention start point
    if (!textareaRef.current || mentionStartRef.current === null) return;
    
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    rafRef.current = requestAnimationFrame(() => {
      if (textareaRef.current && mentionStartRef.current !== null) {
        // Calculate coordinates based on the '@' index, anchoring it in place
        setCoords(getCaretCoordinates(textareaRef.current, mentionStartRef.current));
      }
    });
  };

  useLayoutEffect(() => {
    if (!isOpen || !textareaRef.current) return;

    const textarea = textareaRef.current;
    
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true); 
    textarea.addEventListener("scroll", updateCoords);

    const resizeObserver = new ResizeObserver(updateCoords);
    resizeObserver.observe(textarea);

    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
      textarea.removeEventListener("scroll", updateCoords);
      resizeObserver.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen]);

  useEffect(() => {
  setSelectedMentions(prev =>
    prev.filter(user =>
      value.toLowerCase().includes(`@${user.username.toLowerCase()}`)
    )
  );
}, [value]);

  const handleSelectionChange = () => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const active = getActiveMention(value, cursor);

    if (active) {
      if (!isOpen) callbacks?.onMentionStarted?.();
      setQuery(active.query);
      
      // Update state AND ref so the rAF cycle can immediately access the start position
      setMentionStartIndex(active.startIndex);
      mentionStartRef.current = active.startIndex;
      
      updateCoords();
      setIsOpen(true);
    } else {
      closeDropdown();
    }
  };

  const closeDropdown = () => {
    if (isOpen) callbacks?.onMentionClosed?.();
    setIsOpen(false);
    setSuggestions([]);
    setActiveIndex(0);
    setMentionStartIndex(null);
    mentionStartRef.current = null;
  };

  const insertMention = (user: User) => {
    if (!textareaRef.current || mentionStartIndex === null) return;
    
    const cursor = textareaRef.current.selectionStart;
    const { newText, newCursorPosition } = replaceMention(value, mentionStartIndex, cursor, user.username);
    
    onChange(newText);
    if (user.username !== "interact") {
      setSelectedMentions(prev => {
        if (prev.some(u => u._id === user._id)) return prev;
        return [...prev, user];
      });
    }
    callbacks?.onMentionSelected?.(user);
    closeDropdown();

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      const currentQuery = query.toLowerCase();
      let results: User[] = [];

      if ("interact".startsWith(currentQuery)) {
        results.push(INTERACT_USER);
      }

      if (cache.current[currentQuery]) {
        results = [...results, ...cache.current[currentQuery].filter(u => u.username !== "interact")];
        setSuggestions(results.slice(0, 8));
        setActiveIndex(0);
        return;
      }

      if (cancelToken.current) cancelToken.current.cancel();
      cancelToken.current = axios.CancelToken.source();

      try {
        const { data } = await axios.get<User[]>(`${BACKEND_URL}/api/search?q=${currentQuery}`, {
          cancelToken: cancelToken.current.token,
        });
        
        cache.current[currentQuery] = data;
        const merged = [...results, ...data.filter((u: User) => u.username !== "interact")];
        setSuggestions(merged.slice(0, 8));
        setActiveIndex(0);
      } catch (err) {
        if (!axios.isCancel(err)) console.error("Mention search error:", err);
      }
    };

    const timer = setTimeout(fetchUsers, 250);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case "Enter":
      case "Tab":
        e.preventDefault();
        insertMention(suggestions[activeIndex]);
        break;
      case "Escape":
        e.preventDefault();
        closeDropdown();
        break;
    }
  };

  return {
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
  };
};