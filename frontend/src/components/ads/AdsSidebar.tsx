import React from "react";
import { Trash2 } from "lucide-react";
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
  deleteAdGroup,
  resetAdGroup,
}: {
  activeTab: string;
  campaignName: string;
  adGroups: AdGroup[];
  activeAdGroup: number | null;
  setActiveAdGroup: (id: number) => void;
  addAdGroup: () => void;
  deleteAdGroup: (id: number) => void;
  resetAdGroup: () => void;
}) {
  return (
    <div className="w-[320px] bg-white border-r border-gray-200 p-4">

      {/* ONLY CAMPAIGNS LOGIC FOR NOW */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">

          {/* CAMPAIGN NAME (AUTO GENERATED + CLICKABLE) */}
          <button
            className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition"
            onClick={resetAdGroup}
          >
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Campaign</div>
            <div className="text-sm font-bold text-gray-900">
              {campaignName}
            </div>
          </button>

          {/* AD GROUP SECTION */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Ad Groups</span>

              <button
                onClick={addAdGroup}
                className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#3D7A6E] text-white hover:bg-[#2F5E55] transition"
              >
                + Add
              </button>
            </div>

            {/* AD GROUP LIST */}
            <div className="space-y-2">
              {adGroups.map((group) => {
                const isActive = activeAdGroup === group.id;

                return (
                  <div
                    key={group.id}
                    className={`w-full px-3 py-2 rounded-lg transition border ${activeAdGroup === group.id
                      ? "border-[#3D7A6E] bg-[#3D7A6E]/10"
                      : "border-gray-200 hover:bg-gray-50"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">

                      <button
                        onClick={() => setActiveAdGroup(group.id)}
                        className="flex-1 text-left"
                      >
                        <div
                          className={`text-sm font-semibold ${activeAdGroup === group.id
                            ? "text-[#3D7A6E]"
                            : "text-gray-800"
                            }`}
                        >
                          {group.name}
                        </div>
                      </button>
                      {adGroups.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAdGroup(group.id);
                          }}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}