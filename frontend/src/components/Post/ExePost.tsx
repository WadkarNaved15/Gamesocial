import React, { useMemo, useState } from 'react';
import PostHeader from './PostHeader';
import PostInteractions from './PostInteractions';
import type { ExePostProps } from '../../types/Post';
import axios from 'axios';

const ExePost: React.FC<ExePostProps> = ({
  user,
  description,
  gameUrl,
  createdAt,
  likes = 0,
  comments = 0,
}) => {
  const timestamp = useMemo(() => new Date(createdAt).toLocaleString(), [createdAt]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';


const handleGameStream = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await axios.post(`${BACKEND_URL}/api/gameRoutes/start_game`, {
      gameUrl,
    });

    if (response.status !== 200) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const data = response.data;
    console.log('Game stream started:', data);

    // further logic...

  } catch (err: any) {
    setError(err.message || 'Unknown error');
  } finally {
    setLoading(false);
  }
};


  return (
    <article className="bg-white border-b-2 w-full border-gray-200 dark:border-gray-600 dark:bg-gray-800 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      <div className="p-4">
        <PostHeader username={user.username} timestamp={timestamp} />

        {description && (
          <div className="mb-4">
            <p className="text-gray-800 dark:text-gray-200">{description}</p>
          </div>
        )}

        <div className="relative overflow-hidden bg-gray-100 dark:bg-gray-700 h-[400px] rounded-xl">
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <button
              onClick={handleGameStream}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all"
            >
              {loading ? 'Loading...' : 'Play Game'}
            </button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </div>
        </div>

        <PostInteractions likes={likes} comments={comments} />
      </div>
    </article>
  );
};

export default ExePost;
