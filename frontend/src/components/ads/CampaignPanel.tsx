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
    icon: Eye,
    desc: "Maximize your brand's presence by showing your ad to the largest possible audience within your targeting parameters.",
    bestFor: "Brand awareness, new product launches, and local business promotions aiming for maximum visibility.",
    features: ["Optimized CPM billing", "Frequency capping controls", "Broad demographic penetration"],
    metric: "Estimated Impressions & Unique Reach"
  },
  {
    key: "traffic",
    title: "Website Traffic",
    icon: Globe,
    desc: "Direct highly interested prospects to your high-value destinations, whether it's a specific website landing page, a blog post, or a portal link.",
    bestFor: "Increasing site content consumption, promoting informational articles, or driving potential leads to customized squeeze pages.",
    features: ["Landing page view optimization", "Link click tracking", "High click-through-rate (CTR) priority targeting"],
    metric: "Link Clicks & Cost Per Click (CPC)"
  },
  {
    key: "sales",
    title: "Sales",
    icon: ShoppingBag,
    desc: "Find audiences who are statistical outliers most likely to complete a definitive transaction, push a conversion, or book an appointment.",
    bestFor: "E-commerce store orders, SaaS sign-ups, lead magnet forms, and high-intent direct response advertising.",
    features: ["Pixel tracking integration", "Value-based optimization strategies", "Dynamic catalog item retargeting"],
    metric: "Cost Per Acquisition (CPA) & Return on Ad Spend (ROAS)"
  },
  {
    key: "app_installs",
    title: "App Installs",
    icon: Download,
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
    <div className="flex-1 bg-white px-8 py-6 space-y-6">

      {/* CAMPAIGN HEADER */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="text-xs text-gray-500 mb-0.5 uppercase tracking-wider font-semibold">Campaign Name</div>
        <div className="text-lg font-bold text-gray-900">
          {campaignName}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-2 text-gray-900">
          Select Objective
        </h3>

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
                  className={`w-full p-4 rounded-xl border text-left transition-all text-sm font-semibold flex items-center gap-3.5 ${
                    isActive
                      ? "border-[#3D7A6E] bg-[#3D7A6E]/10 text-[#3D7A6E] shadow-sm"
                      : "border-gray-200 text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <IconComponent 
                    className={`h-5 w-5 shrink-0 ${
                      isActive ? "text-[#3D7A6E]" : "text-gray-400"
                    }`} 
                  />
                  <span>{obj.title}</span>
                </button>
              );
            })}
          </div>

          {/* RIGHT COLUMN: EXPANDED INFO DISPLAY PANEL */}
          <div className="md:col-span-3 p-6 rounded-xl border border-gray-200 bg-white flex flex-col justify-between shadow-sm">
            {activeObjective ? (
              <div className="flex flex-col h-full space-y-6">
                
                {/* Header with large icon and title */}
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#3D7A6E]/10 rounded-xl text-[#3D7A6E] shrink-0">
                    <activeObjective.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2 text-gray-900">
                      {activeObjective.title} Campaign Overview
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-800">
                      {activeObjective.desc}
                    </p>
                  </div>
                </div>

                {/* Best For Section */}
                <section>
                  <h3 className="text-lg font-bold mb-2 text-gray-900">
                    Best Suited For
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-800">
                    {activeObjective.bestFor}
                  </p>
                </section>

                {/* Features Bullets */}
                <section>
                  <h3 className="text-lg font-bold mb-2 text-gray-900">
                    Key Implementation Features
                  </h3>
                  <ul className="text-sm leading-relaxed list-disc list-inside space-y-1.5 text-gray-800">
                    {activeObjective.features.map((feat, i) => (
                      <li key={i}>
                        <span className="font-semibold">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Performance Footnote */}
                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-900">
                    Primary Performance Metric:
                  </span>
                  <span className="text-sm leading-relaxed text-gray-800">
                    {activeObjective.metric}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm leading-relaxed text-gray-400 text-center italic my-auto">
                Select an objective from the left menu to view detailed operational features.
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}