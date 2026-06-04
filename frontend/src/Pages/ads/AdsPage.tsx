import React, { useState } from "react";
import AdsNavbar from "../../components/ads/AdsNavbar";
import AdsSidebar from "../../components/ads/AdsSidebar";
import CampaignPanel from "../../components/ads/CampaignPanel";
import AdGroupPanel from "../../components/ads/AdGroupPanel";
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

    const [activeAdGroup, setActiveAdGroup] = useState(1);
    const selectedAdGroup = adGroups.find(g => g.id === activeAdGroup);
    const addAdGroup = () => {
        const newGroup = createDefaultAdGroup(adGroups.length + 1);

        setAdGroups([...adGroups, newGroup]);
        setActiveAdGroup(newGroup.id);
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#191919] flex flex-col">

            <AdsNavbar activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="flex flex-1">

                {/* LEFT SIDEBAR */}
                <AdsSidebar
                    activeTab={activeTab}
                    campaignName={campaignName}
                    adGroups={adGroups}
                    activeAdGroup={activeAdGroup}
                    setActiveAdGroup={setActiveAdGroup}
                    addAdGroup={addAdGroup}
                />

                {/* RIGHT PANEL WRAPPER (IMPORTANT FIX) */}
                <div className="flex-1">
                    {activeTab === "campaigns" && (
                        <>
                            {selectedAdGroup ? (
                                <AdGroupPanel
                                    adGroup={selectedAdGroup}
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
                                    selectedObjective={selectedObjective}
                                    setSelectedObjective={setSelectedObjective}
                                />
                            )}
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}