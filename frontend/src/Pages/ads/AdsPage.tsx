import React, { useState } from "react";
import AdsNavbar from "../../components/ads/AdsNavbar";
import AdsSidebar from "../../components/ads/AdsSidebar";
import CampaignPanel from "../../components/ads/CampaignPanel";
import AdGroupPanel from "../../components/ads/AdGroupPanel";
import AdModelPostForm from "../../components/PostModal/ActivePostForm/AdModelPostForm";
import MediaAdPostForm from "../../components/PostModal/ActivePostForm/MediaAdPostForm";
import PrerollAdPostForm from "../../components/PostModal/ActivePostForm/PrerollAdPostForm";
import ComposerSidebar from "../../components/ads/ComposerSidebar";
import type { AdGroup } from "../../types/ads";

const createDefaultAdGroup = (id: number): AdGroup => ({
  id,
  customName: "",

  posts: [],

  budget: 0,
  startTime: "",
  endTime: "",
  targeting: {
    location: "",
    languages: "",
    gender: "all",
    ageType: "all",
    ageMin: undefined,
    ageMax: undefined,
    device: "",
  },
});

export default function AdsPage() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [selectedObjective, setSelectedObjective] = useState("reach");
  const [activePostId, setActivePostId] =
    useState<string | null>(null);
  const [campaignName, setCampaignName] = useState(() => {
    const now = new Date();
    return `Campaign · ${now.toLocaleDateString()} · ${now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  });

  const [adGroups, setAdGroups] = useState<AdGroup[]>([
    createDefaultAdGroup(1),
  ]);

  const [activeAdGroup, setActiveAdGroup] = useState<number | null>(null);
  const [activeComposerType, setActiveComposerType] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [composerTargetGroup, setComposerTargetGroup] =
    useState<number | null>(null);
  const selectedAdGroup = adGroups.find(g => g.id === activeAdGroup);
  const deleteAdGroup = (id: number) => {
    if (adGroups.length <= 1) return;

    setAdGroups((prev) => prev.filter((group) => group.id !== id));

    if (activeAdGroup === id) {
      setActiveAdGroup(null);
    }
  };;

  const addAdGroup = () => {
    const nextId =
      adGroups.length > 0
        ? Math.max(...adGroups.map((g) => g.id)) + 1
        : 1;

    const newGroup = createDefaultAdGroup(nextId);

    setAdGroups((prev) => [...prev, newGroup]);

    setActiveAdGroup(nextId);
  };

  const createDraftPost = (
    groupId: number,
    type: "feed" | "preroll" | "3d"
  ) => {
   
    const postId = crypto.randomUUID();

    setAdGroups(prev =>
      prev.map(group =>
        group.id === groupId
          ? {
            ...group,
            posts: [
              ...group.posts,
              {
                id: postId,
                name: `Post ${group.posts.length + 1}`,
                type,
                status: "draft",
              },
            ],
          }
          : group
      )
    );

    setActivePostId(postId);
    setActiveComposerType(type);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      <AdsNavbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex flex-1">
        {/* LEFT SIDEBAR (SWITCH BASED ON TAB) */}
        {activeTab === "campaigns" && (
          <AdsSidebar
            activeTab={activeTab}
            campaignName={campaignName}
            adGroups={adGroups}
            activeAdGroup={activeAdGroup}
            setActiveAdGroup={setActiveAdGroup}
            addAdGroup={addAdGroup}
            deleteAdGroup={deleteAdGroup}
            resetAdGroup={() => setActiveAdGroup(null)}
            setComposerTargetGroup={setComposerTargetGroup}
            setShowComposer={setShowComposer}
            setActiveTab={setActiveTab}
            setActiveComposerType={setActiveComposerType}
            setActivePostId={setActivePostId}
          />
        )}

        {activeTab === "composer" && (
          <ComposerSidebar
            activeComposerType={activeComposerType}
            setActiveComposerType={setActiveComposerType}
            createDraftPost={createDraftPost}
            composerTargetGroup={composerTargetGroup}
          />
        )}

        {/* RIGHT PANEL */}
        <div className="flex-1">
          {activeTab === "campaigns" && (
            <>
              {showComposer ? (
                <div className="flex h-full">

                  <ComposerSidebar
                    activeComposerType={activeComposerType}
                    setActiveComposerType={setActiveComposerType}
                    createDraftPost={createDraftPost}
                    composerTargetGroup={composerTargetGroup}
                  />

                  <div className="flex-1 p-6">

                    {activeComposerType === null && (
                      <div className="text-gray-400 text-sm">
                        Select a Composer type to begin
                      </div>
                    )}

                    {activeComposerType === "3d" && (
                      <AdModelPostForm
                        onCancel={() => {
                          setShowComposer(false);
                          setActiveComposerType(null);
                        }}
                        onBack={() => setActiveComposerType(null)}
                      />
                    )}

                    {activeComposerType === "feed" && (
                      <MediaAdPostForm
                        onCancel={() => {
                          setShowComposer(false);
                          setActiveComposerType(null);
                        }}
                        onBack={() => setActiveComposerType(null)}
                      />
                    )}

                    {activeComposerType === "preroll" && (
                      <PrerollAdPostForm
                        onCancel={() => {
                          setShowComposer(false);
                          setActiveComposerType(null);
                        }}
                        onBack={() => setActiveComposerType(null)}
                      />
                    )}

                  </div>

                </div>
              ) : (
                <>
                  {activeAdGroup !== null && selectedAdGroup ? (
                    <AdGroupPanel
                      adGroup={selectedAdGroup}
                      displayName={
                        selectedAdGroup.customName?.trim()
                          ? selectedAdGroup.customName
                          : `Ad Group ${adGroups.findIndex(
                            (g) => g.id === selectedAdGroup.id
                          ) + 1
                          }`
                      }
                      updateAdGroup={(updated) => {
                        setAdGroups((prev) =>
                          prev.map((g) =>
                            g.id === updated.id ? updated : g
                          )
                        );
                      }}
                    />
                  ) : (
                    <CampaignPanel
                      campaignName={campaignName}
                      setCampaignName={setCampaignName}
                      selectedObjective={selectedObjective}
                      setSelectedObjective={setSelectedObjective}
                    />
                  )}
                </>
              )}
            </>
          )}

          {activeTab === "composer" && (
            <div className="p-6">
              {activeComposerType === null && (
                <div className="text-gray-400 text-sm">
                  Select a Composer type to begin
                </div>
              )}

              {activeComposerType === "3d" && (
                <div className="flex justify-center w-full">
                  <AdModelPostForm
                    onCancel={() => setActiveComposerType(null)}
                    onBack={() => setActiveComposerType(null)}
                  />
                </div>
              )}
              {activeComposerType === "feed" && (
                <div className="flex justify-center w-full">
                  <MediaAdPostForm
                    onCancel={() => setActiveComposerType(null)}
                    onBack={() => setActiveComposerType(null)}
                  />
                </div>
              )}
              {activeComposerType === "preroll" && (
                <div className="flex justify-center w-full">
                  <PrerollAdPostForm
                    onCancel={() => setActiveComposerType(null)}
                    onBack={() => setActiveComposerType(null)}

                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}