import React from "react";
import { Box, Image, Video } from "lucide-react";

const composerItems = [
  { key: "3d", label: "3D Ads", icon: Box },
  { key: "feed", label: "Feed Ads", icon: Image },
  { key: "preroll", label: "Pre Roll Ads", icon: Video },
];

export default function ComposerSidebar({
  activeComposerType,
  setActiveComposerType,
  createDraftPost,
  composerTargetGroup,
}: {
  activeComposerType: string | null;
  setActiveComposerType: (val: string) => void;
  createDraftPost: (
    groupId: number,
    type: "feed" | "preroll" | "3d"
  ) => void;

  composerTargetGroup: number | null;


}) {
  return (
    <div className="w-[320px] bg-white border-r border-gray-200 p-4 space-y-2">
      {composerItems.map((item) => {
        const isActive = activeComposerType === item.key;
        const Icon = item.icon;

        return (
          <button
            key={item.key}
            onClick={() => {
              if (!composerTargetGroup) return;

              createDraftPost(
                composerTargetGroup,
                item.key as "feed" | "preroll" | "3d"
              );

              setActiveComposerType(item.key);
            }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg border transition text-sm font-semibold ${isActive
                ? "border-[#3D7A6E] bg-[#3D7A6E]/10 text-[#3D7A6E]"
                : "border-gray-200 text-gray-800 hover:bg-gray-50"
              }`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-[#3D7A6E]" : "text-gray-400"}`} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}