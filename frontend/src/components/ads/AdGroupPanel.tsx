import React, { useState } from "react";
import { countries } from "../../data/geo";
import { languages } from "../../data/languages";
// Imported Lucide Icons to match the Campaign panel styling paradigm
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

  // Reusable styles matching your clean form inputs
  const inputStyle = "w-full mt-1.5 p-3 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all";
  const labelStyle = "block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500";
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
    <div className="flex-1 p-6 space-y-6">

      {/* MATCHING AD GROUP HEADER */}
      <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/10 rounded-xl p-4 shadow-sm">
        <div className="text-xs text-gray-500 mb-0.5">Ad Group Name</div>
        <div className="text-lg font-semibold text-gray-900 dark:text-white">
          {adGroup.name || "Unnamed Ad Group"}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">
          Configure Ad Group Settings
        </h2>

        {/* TWO-COLUMN LAYOUT MATCHING CAMPAIGN PANEL */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch">

          {/* LEFT COLUMN: CORE PARAMETERS (BUDGET & TIMING) */}
          <div className="md:col-span-2 flex flex-col gap-4">

            {/* Ad Group Identity Box */}
            <div className="p-4 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/10 rounded-xl shadow-sm space-y-3.5">
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
            <div className="p-4 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/10 rounded-xl shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-semibold text-xs uppercase tracking-wider">
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

          {/* RIGHT COLUMN: TARGETING DEMOGRAPHICS (MATCHES EXPANDED OVERVIEW LOOK) */}
          <div className="md:col-span-3 p-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e1e1e] flex flex-col justify-between shadow-sm space-y-5">

            <div className="flex flex-col space-y-5 h-full">

              {/* Header section matching Campaign overview style */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-violet-50 dark:bg-violet-500/10 rounded-xl text-violet-600 dark:text-violet-400 shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Audience Targeting Parameters
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    Refine who sees your ads. Narrow down geographic boundaries, language sets, and hardware delivery profiles.
                  </p>
                </div>
              </div>

              <hr className="border-gray-100 dark:border-white/5" />

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
                    <div className="absolute z-50 w-full bg-white dark:bg-[#1e1e1e] border mt-1 rounded-lg max-h-48 overflow-auto">
                      {filteredCountries.map((item) => (
                        <div
                          key={item}
                          onClick={() => {
                            updateTargeting("location", item);
                            setShowLocations(false);
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer text-sm"
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
                    <div className="absolute z-50 w-full bg-white dark:bg-[#1e1e1e] border mt-1 rounded-lg max-h-48 overflow-auto">
                      {filteredLanguages.map((item) => (
                        <div
                          key={item}
                          onClick={() => {
                            updateTargeting("languages", item);
                            setShowLanguages(false);
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer text-sm"
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

              {/* Smooth Inline Dynamic Age Bracket Container */}
              {adGroup.targeting?.ageType === "range" && (
                <div className="p-4 rounded-xl bg-violet-50/40 dark:bg-violet-500/5 border border-dashed border-violet-200 dark:border-violet-500/20 space-y-2 animate-fade-in">
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
                  <span className="flex items-center gap-1.5"><Smartphone className="h-3 w-3 text-gray-400" /> Device System Profiling</span>
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