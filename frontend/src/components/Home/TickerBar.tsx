import React from "react";

interface NewsItem {
  id: string;
  text: string;
  icon: string;
}

const TickerBar: React.FC = () => {
  const newsItems: NewsItem[] = [
    { id: "1", text: "Unity 2024.1 released with enhanced graphics pipeline and AI tools", icon: "fa-rocket" },
    { id: "2", text: "Indie Game Festival 2024 submissions now open - $50K prize pool", icon: "fa-trophy" },
    { id: "3", text: "Epic Games announces $100M fund for Unreal Engine developers", icon: "fa-dollar-sign" },
    { id: "4", text: "Steam Next Fest showcases 1000+ upcoming indie games", icon: "fa-gamepad" },
    { id: "5", text: "PlayStation VR2 sales exceed 2 million units worldwide", icon: "fa-vr-cardboard" },
    { id: "6", text: "Game Developers Conference 2024 announces keynote speakers", icon: "fa-microphone" },
    { id: "7", text: "Nintendo Direct reveals 15 new titles coming this year", icon: "fa-star" },
    { id: "8", text: "Godot 4.2 introduces advanced 3D rendering capabilities", icon: "fa-cube" },
  ];

  // Duplicate the news items for seamless loop
  const duplicatedNews = [...newsItems, ...newsItems];

  return (
<div className="bg-gradient-to-b from-[#112F27] to-[#0A1E19] 
  border-b border-[#265F53]/30 overflow-hidden fixed 
  top-[50px] left-0 right-0 z-40 shadow-md shadow-black/30">

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20 pointer-events-none"></div>

      <div className="relative flex items-center h-8">
        {/* Left BREAKING label */}
        <div className="flex-shrink-0 bg-[#1A3C34] px-4 h-full flex items-center border-r border-[#265F53]/50">
          <i className="fas fa-newspaper text-[#3D7A6E] mr-2"></i>
          <span className="text-white font-semibold text-sm">BREAKING</span>
        </div>

        {/* Ticker content */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center h-full animate-scroll whitespace-nowrap">
            {duplicatedNews.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="flex items-center space-x-3 px-8"
              >
                <i className={`fas ${item.icon} text-[#3D7A6E]`}></i>
                <span className="text-white text-sm">{item.text}</span>
                <span className="text-[#265F53] mx-4">•</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TickerBar;
