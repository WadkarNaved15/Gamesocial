import React from "react";

const PostSkeleton = () => {
  return (
    <div className="w-full border border-gray-200 dark:border-gray-700 border-l-0 border-r-0 sm:border-l sm:border-r bg-white dark:bg-[#191919] px-4 py-3">

      <div className="flex gap-3">
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full skeleton-shimmer" />

        <div className="flex-1 space-y-3">
          {/* Username + time */}
          <div className="flex gap-2 items-center">
            <div className="h-4 w-24 rounded skeleton-shimmer" />
            <div className="h-3 w-10 rounded skeleton-shimmer" />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <div className="h-3 w-full rounded skeleton-shimmer" />
            <div className="h-3 w-5/6 rounded skeleton-shimmer" />
          </div>

          {/* Media */}
          <div className="h-[300px] w-full rounded-2xl skeleton-shimmer" />

          {/* Actions */}
          <div className="flex gap-6 mt-3">
            <div className="h-4 w-10 rounded skeleton-shimmer" />
            <div className="h-4 w-10 rounded skeleton-shimmer" />
            <div className="h-4 w-10 rounded skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostSkeleton;