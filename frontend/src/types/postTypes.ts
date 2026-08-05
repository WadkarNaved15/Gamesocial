// src/types/postTypes.ts
// PostType here is the CREATE modal's type selector ID.
// It is deliberately separate from the API PostType in Post.ts —
// the API returns "pocket_update" (feed entries) while the modal uses "pocket"
// (the editor entry point). They are different concepts.

export type PostType =
  | "model"
  | "media"
  | "game"
  | "devlog"
  | "article"
  | "ad_model"
  | "pocket";

export const POST_TYPES: { id: PostType; label: string }[] = [
  { id: "model",    label: "3D Model"      },
  { id: "media",    label: "Media"         },
  { id: "game",     label: "Game"          },
  { id: "devlog",   label: "Canvas"        },
  { id: "article",  label: "Blog"     },
  { id: "ad_model", label: "Ad Model"      },
  { id: "pocket",   label: "Pocket Update" },
];