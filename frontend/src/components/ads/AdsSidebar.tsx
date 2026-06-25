import React from "react";
import { Trash2, Plus, FileText } from "lucide-react";
import { AdGroup } from "../../types/ads";

export default function AdsSidebar({
  activeTab,
  campaignName,
  adGroups,
  activeAdGroup,
  setActiveAdGroup,
  addAdGroup,
  deleteAdGroup,
  resetAdGroup,
  setComposerTargetGroup,
  setActiveTab,
  setShowComposer,
  setActiveComposerType,
  setActivePostId,
}: {
  activeTab: string;
  campaignName: string;
  adGroups: AdGroup[];
  activeAdGroup: number | null;
  setActiveAdGroup: (id: number) => void;
  addAdGroup: () => void;
  deleteAdGroup: (id: number) => void;
  resetAdGroup: () => void;
  setComposerTargetGroup: (id: number) => void;
  setActiveTab: (tab: string) => void;
  setShowComposer: (value: boolean) => void;
  setActiveComposerType: (value: string | null) => void;
  setActivePostId: (id: string) => void;
}) {
  return (
    <div className="w-[320px] bg-white border-r border-gray-200 p-4 flex flex-col h-full select-none">
      <div className="space-y-4">

        {/* CAMPAIGN SECTION */}
        <button
          className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 active:bg-gray-200 transition shadow-sm"
          onClick={() => {
            resetAdGroup();
            setShowComposer(false);
            setActiveComposerType(null);
            setActivePostId("");
          }}
        >
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Campaign</div>
          <div className="text-sm font-bold text-gray-900 truncate">
            {campaignName}
          </div>
        </button>

        {/* AD GROUP SECTION HEADER */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Ad Groups</span>

            <button
              onClick={addAdGroup}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-[#3D7A6E] text-white hover:bg-[#2F5E55] active:scale-95 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {/* AD GROUP LIST */}
          <div className="space-y-3">
            {adGroups.map((group, index) => {
              const isActive = activeAdGroup === group.id;

              return (
                <div
                  key={group.id}
                  className={`rounded-xl border p-2 transition ${isActive
                      ? "border-[#3D7A6E] bg-[#3D7A6E]/5"
                      : "border-gray-200 bg-white"
                    }`}
                >
                  {/* AD GROUP HEADER BUTTON */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <button
                      onClick={() => {
                        setActiveTab("campaigns");
                        setActiveAdGroup(group.id);
                        setComposerTargetGroup(group.id);
                        setShowComposer(false);
                        setActiveComposerType(null);
                        setActivePostId("");
                      }}
                      className="flex-1 text-left p-1.5 rounded-md hover:bg-gray-50 transition"
                    >
                      <div
                        className={`text-sm font-bold truncate ${isActive ? "text-[#3D7A6E]" : "text-gray-800"
                          }`}
                      >
                        {group.customName?.trim() || `Ad Group ${index + 1}`}
                      </div>
                    </button>

                    {adGroups.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAdGroup(group.id);
                        }}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* CHILD POSTS CONTAINER */}
                  <div className="pl-2 border-l-2 border-gray-100 ml-3 space-y-1">
                    {group.posts?.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => {
                          setActiveTab("campaigns");
                          setActiveAdGroup(group.id);
                          setActivePostId(post.id);
                          setActiveComposerType(post.type);
                          setShowComposer(true);
                        }}
                        className="w-full flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 transition font-medium"
                      >
                        <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{post.name}</span>
                      </button>
                    ))}

                    {/* ADD POST BUTTON */}
                    <button
                      onClick={() => {
                        setActiveAdGroup(group.id);
                        setComposerTargetGroup(group.id);
                        setShowComposer(true);
                        setActiveComposerType(null);
                      }}
                      className="w-full flex items-center justify-center gap-1 text-xs py-1.5 px-2 mt-1 rounded-md border border-dashed border-gray-300 text-gray-500 hover:border-[#3D7A6E] hover:text-[#3D7A6E] hover:bg-[#3D7A6E]/5 transition font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Post
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}