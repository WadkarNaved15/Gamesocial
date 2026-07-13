export interface User {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
}

export interface MentionProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
  onMentionSelected?: (user: User) => void;
  onMentionStarted?: () => void;
  onMentionClosed?: () => void;
  onMentionsChange?: (mentions: User[]) => void;
}

export interface Coordinates {
  top: number;
  left: number;
  height: number;
}