import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";

const Right: React.FC = () => {


  return (
    <div className="h-full grid grid-cols-2 gap-4 p-4">
         <div className="h-full bg-white dark:bg-gray-950 shadow-2xl rounded-lg ">
            <img src="/video-games-vertical-resident-evil-gun-video-game-girls-hd-wallpaper-preview.jpg" alt="Billboard 1" className="w-full h-[80%]  mb-4 " />
        </div>
      <div className="h-full bg-white dark:bg-gray-950  shadow-2xl rounded-lg ">
            <img src="/video-games-vertical-resident-evil-gun-video-game-girls-hd-wallpaper-preview.jpg" alt="Billboard 1" className="w-full h-[80%]  mb-4 " />
        </div>

      
    </div>
  );
};

export default Right;
