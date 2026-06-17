import React, { useState } from "react";
import { countries } from "../../data/geo";
import { languages } from "../../data/languages";
// Imported Lucide Icons to match the Ad panel styling paradigm
import {
  Coins,
  MapPin,
  Languages,
  Users,
  Calendar,
  Smartphone
} from "lucide-react";

export default function AdGroupPanel({
  adGroup,
  updateAdGroup,
}: {
  adGroup: any;
  updateAdGroup: (updated: any) => void;
}) {
  if (!adGroup) return null;

  // Helper to deep update targeting fields cleanly
  const updateTargeting = (key: string, value: any) => {
    updateAdGroup({
      ...adGroup,
      targeting: {
        ...adGroup.targeting,
        [key]: value,
      },
    });
  };

  // Reusable styles matching your clean form inputs and documentation theme
  const inputStyle = "w-full mt-1.5 p-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-800 focus:border-[#3D7A6E] outline-none transition-all";
  const labelStyle = "block text-xs font-bold uppercase tracking-wider text-gray-500";
  
  const [locationQuery, setLocationQuery] = useState("");
  const [languageQuery, setLanguageQuery] = useState("");

  const [showLocations, setShowLocations] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);

  const filteredCountries =
    locationQuery.length > 0
      ? countries.filter((c) =>
        c.toLowerCase().includes(locationQuery.toLowerCase())
      )
      : [];

  const filteredLanguages =
    languageQuery.length > 0
      ? languages.filter((l) =>
        l.toLowerCase().includes(languageQuery.toLowerCase())
      )
      : [];
      
  return (
    <div className="flex-1 bg-white px-8 py-6 space-y-6">

      {/* MATCHING AD GROUP HEADER */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-0.5 uppercase tracking-wider font-semibold">Ad Group Name</div>
        <div className="text-lg font-bold text-gray-900">
          {adGroup.name || "Unnamed Ad Group"}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-2 text-gray-900">
          Configure Ad Group Settings
        </h3>

        {/* VERTICAL FLEX LAYOUT */}
        <div className="flex flex-col gap-6">

          {/* SECTION 1: CORE PARAMETERS (BUDGET & TIMING) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Ad Group Identity Box */}
            <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3.5">
              <div>
                <label className={labelStyle}>Rename Ad Group</label>
                <input
                  type="text"
                  placeholder="e.g., Core Demographic - Retargeting"
                  value={adGroup.name || ""}
                  onChange={(e) => updateAdGroup({ ...adGroup, name: e.target.value })}
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>Daily Budget</label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={adGroup.budget || ""}
                    onChange={(e) => updateAdGroup({ ...adGroup, budget: e.target.value })}
                    className={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Schedule Box with unified full Datetime support */}
            <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3.5">
              <div className="flex items-center gap-2 text-[#3D7A6E] font-semibold text-xs uppercase tracking-wider">
                <Calendar className="h-4 w-4" />
                <span>Campaign Run Schedule</span>
              </div>

              <div>
                <label className={labelStyle}>Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={adGroup.startTime || ""}
                  onChange={(e) => updateAdGroup({ ...adGroup, startTime: e.target.value })}
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>End Date & Time</label>
                <input
                  type="datetime-local"
                  value={adGroup.endTime || ""}
                  onChange={(e) => updateAdGroup({ ...adGroup, endTime: e.target.value })}
                  className={inputStyle}
                />
              </div>
            </div>

          </div>

          {/* SECTION 2: TARGETING DEMOGRAPHICS */}
          <div className="p-6 rounded-xl border border-gray-200 bg-white space-y-5">

            <div className="flex flex-col space-y-5 h-full">

              {/* Header section matching Campaign overview style */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#3D7A6E]/10 rounded-xl text-[#3D7A6E] shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2 text-gray-900">
                    Audience Targeting Parameters
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    Refine who sees your ads. Narrow down geographic boundaries, language sets, and hardware delivery profiles.
                  </p>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Geo & Language Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className={labelStyle}>Target Location</label>

                  <input
                    placeholder="e.g. Mumbai, India"
                    value={adGroup.targeting?.location || ""}
                    onChange={(e) => {
                      updateTargeting("location", e.target.value);
                      setLocationQuery(e.target.value);
                      setShowLocations(true);
                    }}
                    onFocus={() => setShowLocations(true)}
                    className={inputStyle}
                  />

                  {showLocations && filteredCountries.length > 0 && (
                    <div className="absolute z-50 w-full bg-white border mt-1 rounded-lg max-h-48 overflow-auto shadow-sm">
                      {filteredCountries.map((item) => (
                        <div
                          key={item}
                          onClick={() => {
                            updateTargeting("location", item);
                            setShowLocations(false);
                          }}
                          className="p-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-800"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className={labelStyle}>Languages</label>

                  <input
                    placeholder="e.g. English, Hindi"
                    value={adGroup.targeting?.languages || ""}
                    onChange={(e) => {
                      updateTargeting("languages", e.target.value);
                      setLanguageQuery(e.target.value);
                      setShowLanguages(true);
                    }}
                    onFocus={() => setShowLanguages(true)}
                    className={inputStyle}
                  />

                  {showLanguages && filteredLanguages.length > 0 && (
                    <div className="absolute z-50 w-full bg-white border mt-1 rounded-lg max-h-48 overflow-auto shadow-sm">
                      {filteredLanguages.map((item) => (
                        <div
                          key={item}
                          onClick={() => {
                            updateTargeting("languages", item);
                            setShowLanguages(false);
                          }}
                          className="p-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-800"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Gender & Age Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>Gender Strategy</label>
                  <select
                    value={adGroup.targeting?.gender || "all"}
                    onChange={(e) => updateTargeting("gender", e.target.value)}
                    className={inputStyle}
                  >
                    <option value="all">All Genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className={labelStyle}>Age Targeting</label>
                  <select
                    value={adGroup.targeting?.ageType || "all"}
                    onChange={(e) => updateTargeting("ageType", e.target.value)}
                    className={inputStyle}
                  >
                    <option value="all">All Ages</option>
                    <option value="range">Custom Age Range</option>
                  </select>
                </div>
              </div>

              {/* Inline Dynamic Age Bracket Container */}
              {adGroup.targeting?.ageType === "range" && (
                <div className="p-4 rounded-xl bg-gray-50/50 border border-dashed border-gray-200 space-y-2">
                  <span className={labelStyle}>Define Target Age Window</span>
                  <div className="flex items-center gap-3">
                    <input
                      placeholder="Minimum Age"
                      type="number"
                      value={adGroup.targeting?.ageMin || ""}
                      onChange={(e) => updateTargeting("ageMin", e.target.value)}
                      className={inputStyle}
                    />
                    <span className="text-gray-400 text-sm font-medium pt-1">to</span>
                    <input
                      placeholder="Maximum Age"
                      type="number"
                      value={adGroup.targeting?.ageMax || ""}
                      onChange={(e) => updateTargeting("ageMax", e.target.value)}
                      className={inputStyle}
                    />
                  </div>
                </div>
              )}

              {/* Hardware Device Fingerprinting Section */}
              <div className="pt-2">
                <label className={labelStyle}>
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="h-3 w-3 text-gray-400" /> Device System Profiling
                  </span>
                </label>
                <input
                  placeholder="e.g. iPhone, Android Flagships"
                  value={adGroup.targeting?.device || ""}
                  onChange={(e) => updateTargeting("device", e.target.value)}
                  className={inputStyle}
                />
              </div>

            </div>

          </div>

        </div>
      </div>

    </div>
  );
}