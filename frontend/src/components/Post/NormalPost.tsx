import React, { memo, useMemo } from 'react';
import PostHeader from './PostHeader';
import PostInteractions from './PostInteractions';
import type { NormalPostProps } from '../../types/Post'; 

const NormalPost: React.FC<NormalPostProps> = ({
  user,
  description,
  media,
  createdAt,
  likes = 0,
  comments = 0,
}) => {
  const timestamp = useMemo(() => new Date(createdAt).toLocaleString(), [createdAt]);

  const mediaUrl = media?.[0] ?? '';
  const isVideo = useMemo(() => /\.(mp4|webm|ogg)$/i.test(mediaUrl), [mediaUrl]);

  return (
    <article className="bg-white border-b-2 w-full border-gray-200 dark:border-gray-600 dark:bg-gray-800 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      <div className="p-4">
        <PostHeader username={user.username} timestamp={timestamp} />

        {description && (
          <p className="mb-4 text-gray-800 dark:text-gray-200">{description}</p>
        )}

        <div className="relative overflow-hidden bg-gray-100 dark:bg-gray-700 h-[400px] rounded-xl">
          {mediaUrl ? (
            isVideo ? (
              <video
                controls
                className="w-full h-full object-contain"
                src={mediaUrl}
                preload="metadata"
              />
            ) : (
              <img
                src={mediaUrl}
                alt="Post content"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">No media available</p>
            </div>
          )}
        </div>

        <PostInteractions likes={likes} comments={comments} />
      </div>
    </article>
  );
};

export default memo(NormalPost);
