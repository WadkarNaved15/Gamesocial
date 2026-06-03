import React from "react";

type AdGroup = {
  id: number;
  name: string;
};

export default function AdsSidebar({
  activeTab,
  campaignName,
  adGroups,
  activeAdGroup,
  setActiveAdGroup,
  addAdGroup,
}: {
  activeTab: string;
  campaignName: string;
  adGroups: AdGroup[];
  activeAdGroup: number;
  setActiveAdGroup: (id: number) => void;
  addAdGroup: () => void;
}) {
  return (
    <div className="w-[320px] border-r border-gray-200 dark:border-white/10 p-4">

      {/* ONLY CAMPAIGNS LOGIC FOR NOW */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">

          {/* CAMPAIGN NAME (AUTO GENERATED + CLICKABLE) */}
          <button className="w-full text-left px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition">
            <div className="text-xs text-gray-500">Campaign</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {campaignName}
            </div>
          </button>

          {/* AD GROUP SECTION */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Ad Groups</span>

              <button
                onClick={addAdGroup}
                className="text-xs px-2 py-1 rounded-md bg-violet-600 text-white hover:bg-violet-700"
              >
                + Add
              </button>
            </div>

            {/* AD GROUP LIST */}
            <div className="space-y-2">
              {adGroups.map((group) => {
                const isActive = activeAdGroup === group.id;

                return (
                  <button
                    key={group.id}
                    onClick={() => setActiveAdGroup(group.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition border ${
                      isActive
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10"
                        : "border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {group.name}
                    </div>

                    {/* ACTIVE DOT */}
                    {isActive && (
                      <div className="mt-1 w-2 h-2 rounded-full bg-violet-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}