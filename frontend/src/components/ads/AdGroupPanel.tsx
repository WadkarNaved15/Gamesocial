import React from "react";

export default function AdGroupPanel({
  adGroup,
  updateAdGroup,
}: {
  adGroup: any;
  updateAdGroup: (updated: any) => void;
}) {
  if (!adGroup) return null;

  return (
    <div className="flex-1 p-6 space-y-6">

      {/* HEADER */}
      <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/10 rounded-xl p-4">
        <div className="text-xs text-gray-500">Ad Group</div>
        <div className="text-lg font-semibold text-gray-900 dark:text-white">
          {adGroup.name}
        </div>
      </div>

      {/* BASIC DETAILS */}
      <div className="grid grid-cols-2 gap-4">

        <input
          placeholder="Ad Group Name"
          value={adGroup.name}
          onChange={(e) =>
            updateAdGroup({ ...adGroup, name: e.target.value })
          }
          className="p-2 rounded-lg border bg-white dark:bg-[#1e1e1e]"
        />

        <input
          placeholder="Daily Budget"
          type="number"
          value={adGroup.budget}
          onChange={(e) =>
            updateAdGroup({ ...adGroup, budget: e.target.value })
          }
          className="p-2 rounded-lg border bg-white dark:bg-[#1e1e1e]"
        />

        <input
          type="time"
          value={adGroup.startTime}
          onChange={(e) =>
            updateAdGroup({ ...adGroup, startTime: e.target.value })
          }
          className="p-2 rounded-lg border bg-white dark:bg-[#1e1e1e]"
        />

        <input
          type="time"
          value={adGroup.endTime}
          onChange={(e) =>
            updateAdGroup({ ...adGroup, endTime: e.target.value })
          }
          className="p-2 rounded-lg border bg-white dark:bg-[#1e1e1e]"
        />
      </div>

      {/* DEMOGRAPHICS */}
      <div className="space-y-3">

        <h3 className="font-semibold text-gray-900 dark:text-white">
          Demographics
        </h3>

        <input
          placeholder="Location (e.g. Mumbai)"
          value={adGroup.targeting.location}
          onChange={(e) =>
            updateAdGroup({
              ...adGroup,
              targeting: {
                ...adGroup.targeting,
                location: e.target.value,
              },
            })
          }
          className="w-full p-2 rounded-lg border bg-white dark:bg-[#1e1e1e]"
        />

        <input
          placeholder="Languages (English, Hindi)"
          value={adGroup.targeting.languages}
          onChange={(e) =>
            updateAdGroup({
              ...adGroup,
              targeting: {
                ...adGroup.targeting,
                languages: e.target.value,
              },
            })
          }
          className="w-full p-2 rounded-lg border bg-white dark:bg-[#1e1e1e]"
        />

        {/* Gender */}
        <select
          value={adGroup.targeting.gender}
          onChange={(e) =>
            updateAdGroup({
              ...adGroup,
              targeting: {
                ...adGroup.targeting,
                gender: e.target.value,
              },
            })
          }
          className="w-full p-2 rounded-lg border bg-white dark:bg-[#1e1e1e]"
        >
          <option value="all">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

        {/* Age */}
        <select
          value={adGroup.targeting.ageType}
          onChange={(e) =>
            updateAdGroup({
              ...adGroup,
              targeting: {
                ...adGroup.targeting,
                ageType: e.target.value,
              },
            })
          }
          className="w-full p-2 rounded-lg border bg-white dark:bg-[#1e1e1e]"
        >
          <option value="all">All Ages</option>
          <option value="range">Age Range</option>
        </select>

        {adGroup.targeting.ageType === "range" && (
          <div className="flex gap-2">
            <input
              placeholder="Min"
              type="number"
              value={adGroup.targeting.ageMin || ""}
              onChange={(e) =>
                updateAdGroup({
                  ...adGroup,
                  targeting: {
                    ...adGroup.targeting,
                    ageMin: e.target.value,
                  },
                })
              }
              className="w-full p-2 rounded-lg border bg-white dark:bg-[#1e1e1e]"
            />

            <input
              placeholder="Max"
              type="number"
              value={adGroup.targeting.ageMax || ""}
              onChange={(e) =>
                updateAdGroup({
                  ...adGroup,
                  targeting: {
                    ...adGroup.targeting,
                    ageMax: e.target.value,
                  },
                })
              }
              className="w-full p-2 rounded-lg border bg-white dark:bg-[#1e1e1e]"
            />
          </div>
        )}

        <input
          placeholder="Device Model (iPhone, Samsung, etc.)"
          value={adGroup.targeting.device}
          onChange={(e) =>
            updateAdGroup({
              ...adGroup,
              targeting: {
                ...adGroup.targeting,
                device: e.target.value,
              },
            })
          }
          className="w-full p-2 rounded-lg border bg-white dark:bg-[#1e1e1e]"
        />
      </div>
    </div>
  );
}