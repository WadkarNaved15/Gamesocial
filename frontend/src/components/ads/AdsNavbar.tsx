import React from "react";
import { useUser } from "../../context/user";
import {
  Megaphone,
  BarChart3,
  PenSquare,
  LayoutGrid,
  FileText,
} from "lucide-react";

const navItems = [
  { label: "Campaigns", key: "campaigns", icon: Megaphone },
  { label: "Analytics", key: "analytics", icon: BarChart3 },
  { label: "Composer", key: "composer", icon: PenSquare },
  { label: "Posts", key: "posts", icon: LayoutGrid },
  { label: "Forms", key: "forms", icon: FileText },
];

export default function AdsNavbar({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const { user } = useUser();

  return (
    <div className="w-full border-b border-gray-200 dark:border-white/10 bg-white/70 dark:bg-[#1e1e1e]/70 backdrop-blur-md">

      <div className="w-full pl-0 pr-4 py-2 flex items-center justify-between gap-8">

        {/* LEFT PROFILE */}
        <div className="flex items-center gap-3 shrink-0 min-w-[180px] pl-3">
          <img
            src={user?.avatar || "/default_avatar.png"}
            className="w-10 h-10 rounded-full object-cover border border-gray-300 dark:border-white/20"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {user?.username || "Guest"}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Ads Manager
            </span>
          </div>
        </div>

        {/* CENTER NAV */}
        <div className="flex flex-1 items-center justify-between md:gap-4 lg:gap-6">
          {navItems.map((item) => {
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className="relative flex flex-1 flex-col items-center justify-center py-2 px-2 rounded-xl transition-colors hover:bg-gray-50 dark:hover:bg-white/5 group"
              >
                <item.icon
                  className={`h-6 w-6 mb-1 transition-colors ${
                    isActive
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white"
                  }`}
                />

                <span
                  className={`text-sm font-medium transition-colors ${
                    isActive
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-gray-600 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
                  }`}
                >
                  {item.label}
                </span>

                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-violet-600 dark:bg-violet-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}