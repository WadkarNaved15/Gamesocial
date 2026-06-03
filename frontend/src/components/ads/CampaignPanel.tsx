import React from "react";
// Imported Lucide Icons for each marketing objective
import { 
  Eye, 
  Globe, 
  ShoppingBag, 
  Download 
} from "lucide-react";

const objectives = [
  {
    key: "reach",
    title: "Reach",
    icon: Eye, // Icon for maximum impressions/visibility
    desc: "Maximize your brand's presence by showing your ad to the largest possible audience within your targeting parameters.",
    bestFor: "Brand awareness, new product launches, and local business promotions aiming for maximum visibility.",
    features: ["Optimized CPM billing", "Frequency capping controls", "Broad demographic penetration"],
    metric: "Estimated Impressions & Unique Reach"
  },
  {
    key: "traffic",
    title: "Website Traffic",
    icon: Globe, // Icon for internet/website direction
    desc: "Direct highly interested prospects to your high-value destinations, whether it's a specific website landing page, a blog post, or a portal link.",
    bestFor: "Increasing site content consumption, promoting informational articles, or driving potential leads to customized squeeze pages.",
    features: ["Landing page view optimization", "Link click tracking", "High click-through-rate (CTR) priority targeting"],
    metric: "Link Clicks & Cost Per Click (CPC)"
  },
  {
    key: "sales",
    title: "Sales",
    icon: ShoppingBag, // Icon for direct e-commerce transactions
    desc: "Find audiences who are statistical outliers most likely to complete a definitive transaction, push a conversion, or book an appointment.",
    bestFor: "E-commerce store orders, SaaS sign-ups, lead magnet forms, and high-intent direct response advertising.",
    features: ["Pixel tracking integration", "Value-based optimization strategies", "Dynamic catalog item retargeting"],
    metric: "Cost Per Acquisition (CPA) & Return on Ad Spend (ROAS)"
  },
  {
    key: "app_installs",
    title: "App Installs",
    icon: Download, // Icon for direct installation/downloads
    desc: "Connect instantly with mobile device users to drive them straight to the App Store or Google Play Store to download your mobile application.",
    bestFor: "Mobile games, utilities, fintech startups, and apps wanting to increase initial installs or in-app registrations.",
    features: ["Direct store deep-linking", "In-app event optimization tracking", "Device OS version segmentation filter"],
    metric: "Cost Per Install (CPI) & Post-Install Retention Rates"
  },
];

export default function CampaignPanel({
  campaignName,
  selectedObjective,
  setSelectedObjective,
}: {
  campaignName: string;
  selectedObjective: string;
  setSelectedObjective: (val: string) => void;
}) {
  const activeObjective = objectives.find((o) => o.key === selectedObjective);

  return (
    <div className="flex-1 p-6 space-y-6">

      {/* CAMPAIGN HEADER */}
      <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/10 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-0.5">Campaign Name</div>
        <div className="text-lg font-semibold text-gray-900 dark:text-white">
          {campaignName}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">
          Select Objective
        </h2>

        {/* TWO-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch">
          
          {/* LEFT COLUMN: VERTICAL OBJECTIVES LIST WITH ICONS */}
          <div className="md:col-span-2 flex flex-col gap-2.5">
            {objectives.map((obj) => {
              const isActive = selectedObjective === obj.key;
              const IconComponent = obj.icon;

              return (
                <button
                  key={obj.key}
                  onClick={() => setSelectedObjective(obj.key)}
                  className={`w-full p-4 rounded-xl border text-left transition-all font-medium flex items-center gap-3.5 ${
                    isActive
                      ? "border-violet-500 bg-violet-50/70 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold shadow-sm"
                      : "border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  {/* Small List Icon */}
                  <IconComponent 
                    className={`h-5 w-5 shrink-0 ${
                      isActive ? "text-violet-600 dark:text-violet-400" : "text-gray-400 dark:text-gray-500"
                    }`} 
                  />
                  <span>{obj.title}</span>
                </button>
              );
            })}
          </div>

          {/* RIGHT COLUMN: EXPANDED INFO DISPLAY PANEL */}
          <div className="md:col-span-3 p-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e1e1e] flex flex-col justify-between shadow-sm">
            {activeObjective ? (
              <div className="flex flex-col h-full space-y-4">
                
                {/* Header with large icon and title */}
                <div className="flex items-start gap-4">
                  {/* Decorative Icon Wrapper */}
                  <div className="p-3 bg-violet-50 dark:bg-violet-500/10 rounded-xl text-violet-600 dark:text-violet-400 shrink-0">
                    <activeObjective.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {activeObjective.title} Campaign Overview
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {activeObjective.desc}
                    </p>
                  </div>
                </div>

                <hr className="border-gray-100 dark:border-white/5" />

                {/* Best For Section */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-500 dark:text-violet-400 block mb-1">
                    Best Suited For
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {activeObjective.bestFor}
                  </p>
                </div>

                {/* Features Bullets */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-2">
                    Key Implementation Features
                  </span>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 pl-4 list-disc marker:text-violet-500">
                    {activeObjective.features.map((feat, i) => (
                      <li key={i}>{feat}</li>
                    ))}
                  </ul>
                </div>

                {/* Performance Footnote */}
                <div className="mt-auto pt-2 bg-gray-50 dark:bg-white/5 -mx-6 -mb-6 p-4 rounded-b-xl border-t border-gray-100 dark:border-white/5">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                    Primary Performance Metric:{" "}
                  </span>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    {activeObjective.metric}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400 dark:text-gray-500 text-center italic my-auto">
                Select an objective from the left menu to view detailed operational features.
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}