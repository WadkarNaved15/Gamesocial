import React from "react";
// Imported More / Menu icons to give it an authentic social feed look
import { Globe, MoreHorizontal, MessageSquare, Heart, Share2 } from "lucide-react";
import AdPreviewFrame from "./AdPreviewFrame";
interface AdPreviewProps {
  ad: {
    pageName?: string;
    pageAvatar?: string;
    text?: string;
    image?: string;
    headline?: string;
    description?: string;
  };
}
export default function AdPreview({ ad }: AdPreviewProps) {
  return (

      <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden text-gray-900 dark:text-white font-sans">
        
        {/* FEED HEADER */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={ad?.pageAvatar || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=80&h=80&q=80"}
              alt="Brand Avatar"
              className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-100 dark:ring-white/10"
            />
            <div>
              <div className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100 hover:underline cursor-pointer">
                {ad?.pageName || "Brand Identity Target"}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 font-medium mt-0.5">
                <span>Sponsored</span>
                <span className="text-[10px]">•</span>
                <Globe className="h-3 w-3 text-gray-400" />
              </div>
            </div>
          </div>
          
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg transition-colors">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        {/* PRIMARY AD BODY COPY */}
        <div className="px-4 pb-3 text-sm text-gray-800 dark:text-gray-200 leading-relaxed break-words whitespace-pre-wrap">
          {ad?.text || "Your primary ad delivery copy will render here once typed. Craft high-converting context to capture direct response impressions."}
        </div>

        {/* BRAND ENGAGEMENT ASSET (MEDIA CONTAINER) */}
        <div className="relative aspect-[1.91/1] w-full bg-gray-50 dark:bg-black/20 border-y border-gray-100 dark:border-white/5 overflow-hidden flex items-center justify-center">
          {ad?.image ? (
            <img
              src={ad.image}
              alt="Creative Asset"
              className="w-full h-full object-cover animate-fade-in"
            />
          ) : (
            <div className="text-center p-6 space-y-1.5">
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Creative Asset Canvas
              </span>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
                1.91:1 Landscape Aspect Ratio recommended for optimized feed delivery.
              </p>
            </div>
          )}
        </div>

        {/* AD PLATFORM BOTTOM ACTION PANEL */}
        <div className="bg-gray-50 dark:bg-[#1a1a1a] p-4 flex items-center justify-between gap-4 border-b border-gray-100 dark:border-white/5">
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block truncate">
              {ad?.pageName || "WWW.BRANDURL.COM"}
            </span>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 truncate leading-snug">
              {ad?.headline || "Attention-Grabbing Headline Container"}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate hidden sm:block">
              {ad?.description || "Secondary explanatory description payload text goes here."}
            </p>
          </div>
          
          <button className="shrink-0 bg-white dark:bg-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#333] text-gray-900 dark:text-white border border-gray-300 dark:border-white/10 text-xs font-bold px-4 py-2 rounded-md shadow-sm transition-all tracking-wide hover:scale-[1.02] active:scale-[0.98]">
            Learn More
          </button>
        </div>

        {/* DECORATIVE FEED INTERACTION FOOTER */}
        <div className="px-4 py-2.5 flex items-center justify-between text-gray-400 dark:text-gray-500 border-t border-gray-50 dark:border-white/[0.02]">
          <div className="flex items-center gap-5 text-xs font-medium">
            <span className="flex items-center gap-1.5 hover:text-red-500 cursor-pointer transition-colors"><Heart className="h-4 w-4" /> Like</span>
            <span className="flex items-center gap-1.5 hover:text-blue-500 cursor-pointer transition-colors"><MessageSquare className="h-4 w-4" /> Comment</span>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium hover:text-violet-500 cursor-pointer transition-colors">
            <Share2 className="h-4 w-4" /> Share
          </span>
        </div>

      </div>
  );
}