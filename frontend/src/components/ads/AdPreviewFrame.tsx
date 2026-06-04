import React from "react";

export default function AdPreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-2xl mx-auto border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-[#0f0f0f] shadow-xl">
      
      {/* PROFESSIONAL BROWSER CHROME HEADER */}
      <div className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-white/10 px-4 py-3 flex items-center justify-between gap-4 select-none">
        
        {/* Window Control Window Pins */}
        <div className="flex items-center gap-1.5 w-16">
          <div className="w-3 h-3 rounded-full bg-red-400 dark:bg-red-500/30"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400 dark:bg-yellow-500/30"></div>
          <div className="w-3 h-3 rounded-full bg-green-400 dark:bg-green-500/30"></div>
        </div>

        {/* Fake URL Bar to mimic Desktop Delivery Context */}
        <div className="flex-1 max-w-md bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-white/5 rounded-lg px-3 py-1 text-center text-xs text-gray-400 dark:text-gray-500 truncate font-mono tracking-wide shadow-inner">
          https://www.socialplatform.com/feed/preview
        </div>

        {/* Balance layout spacer */}
        <div className="w-16 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">
          DESKTOP
        </div>
      </div>

      {/* Screen Canvas Area */}
      <div className="bg-gray-100 dark:bg-[#121212] p-6 min-h-[450px] flex items-center justify-center">
        <div className="w-full max-w-[500px]">
          {children}
        </div>
      </div>
    </div>
  );
}