import React from "react";
import type { PageData } from "../../types/Devlogs";
import AutoResizeTextarea from "./AutoResizeTextarea";

interface BlogProps {
    pageData: PageData;
    handleChange: (key: keyof PageData, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const Blog: React.FC<BlogProps> = ({ pageData, handleChange }) => {
    return (
        <div className="prose prose-invert max-w-none mt-4 mb-8 space-y-4">
                <AutoResizeTextarea
                  value={pageData.italicQuote}
                  className="text-xl italic text-slate-300 bg-transparent outline-none w-full"
                  onChange={(e) => handleChange("italicQuote", e)}

                  />
               {/*   <textarea
                  className="text-slate-300 leading-relaxed bg-transparent outline-none w-full"
                  value={pageData.bodyParagraph1}
                  onChange={(e) => handleChange("bodyParagraph1", e)}
                />
                <textarea
                  className="text-slate-300 leading-relaxed bg-transparent outline-none w-full"
                  value={pageData.bodyParagraph2}
                  onChange={(e) => handleChange("bodyParagraph2", e)}
                />
                <textarea
                  className="text-slate-300 leading-relaxed bg-transparent outline-none w-full"
                  value={pageData.bodyParagraph3}
                  onChange={(e) => handleChange("bodyParagraph3", e)}
                />*/}
                {/* <input
                  type="url"
                  className="text-orange-400 underline bg-transparent outline-none w-full"
                  value={pageData.storeLink}
                  onChange={(e) => handleChange("storeLink", e)}
                />
                 <input
                  type="text"
                  className="text-slate-300 bg-transparent outline-none w-full"
                  value={pageData.closingQuote}
                  onChange={(e) => handleChange("closingQuote", e)}
                />
               <input
                  type="text"
                  className="text-slate-300 bg-transparent outline-none w-full"
                  value={pageData.signature}
                  onChange={(e) => handleChange("signature", e)}
                />*/}
              </div>  
            )
            }

export default Blog;