import React, { useMemo } from 'react';
import PostHeader from './PostHeader';
import PostInteractions from './PostInteractions';
import type { GamePostProps } from '../../types/Post'; // Assuming you have a type definition for PostProps



const GamePost: React.FC<GamePostProps> = ({
  user,
  description,
  gameUrl,
  createdAt,
  likes = 0,
  comments = 0,
}) => {
  const timestamp = useMemo(() => new Date(createdAt).toLocaleString(), [createdAt]);

  const handleStartGame = () => {
    if (gameUrl) {
      window.location.href = gameUrl; // Or use `navigate(gameUrl)` if internal
    }
  };

  return (
    <article
  className="relative bg-white border w-full border-gray-200 
  dark:border-gray-600 dark:bg-black shadow-sm 
  overflow-hidden transition-all duration-300 hover:shadow-md
  /* top bolt */
  before:content-[''] before:absolute before:top-0 before:left-0 
  before:h-[2px] before:w-32 
  before:bg-gradient-to-r before:from-[#3D7A6E] before:via-teal-400 before:to-transparent
  before:animate-shine
  /* left bolt */
  after:content-[''] after:absolute after:top-0 after:left-0 
  after:w-[0.75px] after:h-[40px]
  after:bg-gradient-to-b after:from-[#3D7A6E] after:via-teal-400 after:to-transparent
  after:animate-shine-vertical"
>
      <div className="p-4">
        <PostHeader username={user.username} timestamp={timestamp} />

        {description && (
          <p className="mb-4 text-gray-800 dark:text-gray-200">{description}</p>
        )}

        <div className="relative overflow-hidden bg-gray-100 dark:bg-gray-700 h-[400px] rounded-xl">
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <button
              onClick={handleStartGame}
              disabled={!gameUrl}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all"
            >
              {gameUrl ? 'Start Game' : 'Game Not Available'}
            </button>
          </div>
        </div>

        <PostInteractions likes={likes} comments={comments} />
      </div>
    </article>
  );
};

export default GamePost;
