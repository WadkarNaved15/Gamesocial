import React from "react";
import type { PageData } from "../../types/Devlogs";
import AutoResizeTextarea from "../Devlogs/AutoResizeTextarea";

interface PurchaseProps {
  pageData: PageData;
  handleChange: (key: keyof PageData, e: React.ChangeEvent<HTMLInputElement>) => void;
}

const GameInfo: React.FC<PurchaseProps> = ({ pageData, handleChange }) => {

  return (
     <div className="space-y-6">
              <div className="bg-slate-700 rounded-lg p-6">
                <input
                  type="text"
                  className="text-xl font-bold text-white bg-transparent outline-none w-full"
                  value={pageData.gameInfoTitle}
                  onChange={(e) => handleChange("gameInfoTitle", e)}
                />
                <AutoResizeTextarea
                  value={pageData.gameInfoDescription}
                 className="text-slate-300 bg-transparent outline-none w-full mt-2"
                 onChange={(e) => handleChange("gameInfoDescription", e)}
                />
              </div>
            </div>
          
  );
};

export default GameInfo;
