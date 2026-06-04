import React from "react";
import AdPreviewFrame from "./AdPreviewFrame";
import AdPreview from "./AdPreview";

export default function AdsComposerPage() {
  const mockAd = {
    pageName: "Demo Brand",
    pageAvatar: "/default_avatar.png",
    text: "Your ad preview will look like this in real feeds.",
    image: "https://picsum.photos/800/500",
  };

  return (
    <div className="flex h-full w-full">

      {/* LEFT SIDE: Composer Form */}
      <div className="w-1/2 p-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Ad Composer
        </h1>

        <p className="text-sm text-gray-500 mt-2">
          Create your ad content here
        </p>

        {/* later your form inputs go here */}
      </div>

      {/* RIGHT SIDE: Preview */}
      <div className="w-1/2 flex items-center justify-center bg-gray-100 dark:bg-[#111]">
        <AdPreviewFrame>
          <AdPreview ad={mockAd} />
        </AdPreviewFrame>
      </div>

    </div>
  );
}