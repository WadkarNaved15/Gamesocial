import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import NormalPostDetails from "./NormalPostDetails";
import GamePostDetails from "./GamePostDetails";
import DevlogPostDetails from "./DevlogPostDetails";
import PostDetail from "./PostDetail";
import CircleLoader from "../components/Loader/CircleLoader";
import ContentNotFound from "./ErrorHandling/ContentNotFound";
import { usePosts } from "../context/PostContext";

const PostDetailsPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addPosts } = usePosts();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // 👇 get post from navigation state
  const initialPost = location.state?.post || null;

  const [post, setPost] = useState<any>(initialPost);
  const [loading, setLoading] = useState(!initialPost);
  const from = location.state?.from;
  useEffect(() => {
    // If post already exists (came from feed), don't fetch
    if (initialPost) return;

    if (!postId) return;

    const fetchPost = async () => {
      try {
        const res = await axios.get(
          `${BACKEND_URL}/api/posts/${postId}`,
          { withCredentials: true }
        );
        setPost(res.data);
        addPosts([res.data]);
      } catch (err) {
        console.error("Failed to fetch post:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (loading) return <CircleLoader />;

  // 👇 Replaced the plain div with your custom component
  if (!post) return <ContentNotFound />;

  const handleBack = () => {
    if (from) {
      navigate(from);
    } else {
      navigate("/", {
        replace: true,
      });
    }
  };
  if (post.type === "game_post") {
    return (
      <GamePostDetails
        post={post}
        BACKEND_URL={BACKEND_URL}
        onClose={handleBack}
      />
    );
  }
  if (post.type === "model_post") {
    return <PostDetail post={post} onClose={handleBack} />;
  }

  if (post.type === "devlog_post") {
    return (
      <DevlogPostDetails
        post={post}
        BACKEND_URL={BACKEND_URL}
        onClose={handleBack}
      />
    );
  }

  return (
    <NormalPostDetails
      post={post}
      BACKEND_URL={BACKEND_URL}
      onClose={handleBack}
    />
  );
};

export default PostDetailsPage;