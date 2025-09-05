import {
  useEffect,
  useState,
  useCallback,
  Suspense,
  lazy,
  useRef,
} from 'react';
import { Header } from '../components/Header';
import Post from '../components/Post';
import { useUser } from '../context/user';
import axios from 'axios';
import type { PostProps } from '../types/Post'; 
import CircleLoader from '../components/Loader/CircleLoader';
import TickerBar from '../components/Home/TickerBar';
import UploadBox from '../components/Home/Upload';
import FeedbackModal from '../components/Home/Feedback';

// Lazy-loaded components
const Profile = lazy(() => import('../components/Home/Profile'));
const Billboard = lazy(() => import('../components/Home/Billboard'));
const AddPost = lazy(() => import('../components/Home/AddPost'));
const Music = lazy(() => import('../components/Music'));
const PostModal = lazy(() => import('../components/Home/NewPost'));

function Home() {
  const { user } = useUser();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // const [isModalOpen, setIsModalOpen] = useState(user === null);
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);


  const loaderRef = useRef<HTMLDivElement | null>(null);

  // useEffect(() => {
  //   setIsModalOpen(user === null);
  // }, [user]);

  const fetchPosts = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/posts/fetch_posts`, {
        params: { cursor: nextCursor, limit: 3 },
      });

      const newPosts = res.data.posts;
      const newCursor = res.data.nextCursor;

      setPosts((prev) => {
        const allPosts = [...prev, ...newPosts];
        const uniquePosts = Array.from(new Map(allPosts.map(p => [p._id, p])).values());
        return uniquePosts;
      });
      setNextCursor(newCursor);
      if (!newCursor || newPosts.length === 0) setHasMore(false);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading, hasMore]);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchPosts();
        }
      },
      { threshold: 1.0 }
    );

    const loader = loaderRef.current;
    if (loader) observer.observe(loader);

    return () => {
      if (loader) observer.unobserve(loader);
      observer.disconnect();
    };
  }, [fetchPosts, hasMore, loading]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black">
      <Header />
      <TickerBar />
      
<button
  onClick={() => setIsFeedbackOpen(true)}
  className="fixed top-2/3 left-0 m-0 p-0 rotate-90 
             z-[9999] bg-red-500 text-white px-4 py-2 
             rounded-tl-lg rounded-tr-lg shadow-md 
             hover:bg-red-600 transition-all duration-200 ease-in-out"
  style={{ left: 0 }}
>
  Feedback
</button>



      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        onSubmit={(category, feedback) => {
          console.log("Feedback submitted:", category, feedback);
          // ✅ send to backend API here
        }}
      />

      {/* <Suspense fallback={null}>
        {isModalOpen && <HomeModal onClose={() => setIsModalOpen(false)} />}
      </Suspense> */}

  <main className="max-w-7xl mx-auto pl-2 sm:pl-4 lg:pl-6 pr-4 sm:pr-6 lg:pr-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">

        <div className="lg:col-span-2">
          {/* Profile Sidebar */}
    <div
  className="sticky top-24 shadow-2xl h-54 
  dark:bg-black bg-white rounded-t-xl 
  border-t border-r border-gray-200 dark:border-[#3D7A6E]"
>

            <Suspense fallback={null}>
              <Profile />
            </Suspense>
          </div>

          {/* <div className="lg:col-span-2 sticky shadow-2xl top-24 h-60 
        dark:bg-black bg-white rounded-t-xl 
        border-t border-r border-gray-200 dark:border-[#3D7A6E] 
        hidden lg:block"> */}
        <div className="sticky top-80">
            <UploadBox onUploadClick={() => setIsUploading(true)} />
        </div>
        </div>


            {/* Center Feed + Billboard */}
{isUploading ? (
  <div className="lg:col-span-8 flex flex-col items-center justify-start min-h-[80vh] w-full">
    <Suspense fallback={null}>
      <PostModal onCancel={() => setIsUploading(false)} />
    </Suspense>
  </div>
) : (
  <>
          {/* Center Feed */}
          <div className="lg:col-span-5 flex flex-col items-center justify-start min-h-[80vh] w-full">
            {user && (
              <Suspense fallback={null}>
                <AddPost />
              </Suspense>
            )}

            {posts.length > 0 && (
              <div className="w-full flex flex-col">
                {posts.map((post) => (
                  <Post key={post._id } {...post} />
                ))}
              </div>
            ) }

            {(loading|| posts.length === 0)  && (
              <div className="w-full flex justify-center mt-4">
                <CircleLoader />
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="text-gray-400 dark:text-gray-500 mt-4">
                You've reached the end.
              </div>
            )}

            <div ref={loaderRef} className="h-10 w-full" />
          </div>

          {/* Billboard */}
          <div className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-24 h-[500px]">
              <Suspense fallback={null}>
                <Billboard />
              </Suspense>
            </div>
          </div>
          </>
)}
        </div>
      </main>

      <Suspense fallback={null}>
        <Music />
      </Suspense>
    </div>
  );
}

export default Home;
