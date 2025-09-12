import React from "react";
import type { PageData } from "../../types/Devlogs";
import AutoResizeTextarea from "../Devlogs/AutoResizeTextarea";

interface PurchaseProps {
    pageData: PageData;
    setPageData: React.Dispatch<React.SetStateAction<PageData>>;
    handleChange: (key: keyof PageData, e: React.ChangeEvent<HTMLInputElement>) => void;
}



const SideBar: React.FC<PurchaseProps> = ({ pageData, setPageData,handleChange }) => {
      const handleNestedChange = (
        parentKey: keyof PageData,
        childKey: keyof PageData["gameDetails"],
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => {
        setPageData((prev) => ({
          ...prev,
          [parentKey]: {
            ...prev[parentKey],
            [childKey]: e.target.value,
          },
        }));
      }
      

  return (
     
              <div className="bg-slate-700 rounded-lg p-6 text-sm space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <input
                    type="text"
                    className="text-orange-400 bg-transparent outline-none text-right w-[80%]"
                    value={pageData.gameDetails.status}
                    onChange={(e) => handleNestedChange("gameDetails", "status", e)}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Author</span>
                  <input
                    type="text"
                    className="text-orange-400 bg-transparent outline-none text-right w-[80%]"
                    value={pageData.gameDetails.author}
                    onChange={(e) => handleNestedChange("gameDetails", "author", e)}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Genre</span>
                  <input
                    type="text"
                    className="text-orange-400 bg-transparent outline-none text-right w-[80%]"
                    value={pageData.gameDetails.genre}
                    onChange={(e) => handleNestedChange("gameDetails", "genre", e)}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tags</span>
                  <input
                    type="text"
                    className="text-orange-400 bg-transparent outline-none text-right w-[80%]"
                    value={pageData.gameDetails.tags}
                    onChange={(e) => handleNestedChange("gameDetails", "tags", e)}
                  />
                </div>
              </div>
          
  );
};

export default SideBar;
