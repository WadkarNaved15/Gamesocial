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
}: {
  activeComposerType: string | null;
  setActiveComposerType: (val: string) => void;
}) {
  return (
    <div className="w-[320px] border-r border-gray-200 dark:border-white/10 p-4 space-y-2">
      {composerItems.map((item) => {
        const isActive = activeComposerType === item.key;
        const Icon = item.icon;

        return (
          <button
            key={item.key}
            onClick={() => setActiveComposerType(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg border transition ${
              isActive
                ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10"
                : "border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}