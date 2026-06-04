import React from "react";

export default function AdPreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      
      {/* Outer laptop body */}
      <div className="relative w-[900px] h-[600px] bg-gray-900 rounded-2xl shadow-2xl flex flex-col">

        {/* Top bar (camera area) */}
        <div className="h-6 flex items-center justify-center">
          <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
        </div>

        {/* Screen */}
        <div className="flex-1 bg-white dark:bg-[#0f0f0f] rounded-lg mx-4 mb-4 overflow-hidden shadow-inner">
          {children}
        </div>

        {/* Laptop base */}
        <div className="h-6 bg-gray-800 rounded-b-2xl"></div>
      </div>
    </div>
  );
}