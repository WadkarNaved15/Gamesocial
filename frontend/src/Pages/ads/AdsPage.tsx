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
  name: `Ad Group ${id}`,
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
  const [campaignName] = useState(() => {
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
  const selectedAdGroup = adGroups.find(g => g.id === activeAdGroup);
  
  const addAdGroup = () => {
    const newGroup = createDefaultAdGroup(adGroups.length + 1);
    setAdGroups([...adGroups, newGroup]);
    setActiveAdGroup(newGroup.id);
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
            resetAdGroup={() => setActiveAdGroup(null)}
          />
        )}

        {activeTab === "composer" && (
          <ComposerSidebar
            activeComposerType={activeComposerType}
            setActiveComposerType={setActiveComposerType}
          />
        )}

        {/* RIGHT PANEL */}
        <div className="flex-1">
          {activeTab === "campaigns" && (
            <>
              {activeAdGroup !== null && selectedAdGroup ? (
                <AdGroupPanel
                  adGroup={selectedAdGroup}
                  updateAdGroup={(updated) => {
                    setAdGroups((prev) =>
                      prev.map((g) => (g.id === updated.id ? updated : g))
                    );
                  }}
                />
              ) : (
                <CampaignPanel
                  campaignName={campaignName}
                  selectedObjective={selectedObjective}
                  setSelectedObjective={setSelectedObjective}
                />
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