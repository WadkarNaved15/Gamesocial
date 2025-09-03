import React, { memo } from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';

interface PostInteractionsProps {
  likes: number;
  comments: number;
}

const PostInteractions: React.FC<PostInteractionsProps> = ({ likes, comments }) => {
  return (
    <div className="flex mt-4 justify-between items-center">
      <div className="flex space-x-4">
        <button
          className="flex items-center text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          aria-label="Like post"
        >
          <Heart className="h-5 w-5 mr-1" />
          <span>{likes}</span>
        </button>
        <button
          className="flex items-center text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          aria-label="Comment on post"
        >
          <MessageCircle className="h-5 w-5 mr-1" />
          <span>{comments}</span>
        </button>
        <button
          className="flex items-center text-gray-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors"
          aria-label="Share post"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default memo(PostInteractions);
