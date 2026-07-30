export interface ChatUser {
  id: string;
  name: string;
  avatar: string;
  unreadCount: number;
  status?: string;
  lastSeen?: string;
  chatStatus?: string;
}

// Kept as `any` to match the original component's loose message typing.
// Worth tightening once the backend message shape stabilizes.
export type Message = any;

export type ChatId = string;

export interface MediaViewerState {
  url: string;
  type: "image" | "video";
}