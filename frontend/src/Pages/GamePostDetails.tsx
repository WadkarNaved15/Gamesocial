import { ArrowLeft } from "lucide-react";
import GamePost from "../components/Post/GamePost";
import CommentSection from "../components/Post/CommentSection";

interface GamePostDetailsProps {
  post: any;
  BACKEND_URL: string;
  onClose: () => void;
}

const GamePostDetails: React.FC<GamePostDetailsProps> = ({
  post,
  BACKEND_URL,
  onClose,
}) => {
  return (
    <div className="w-full max-w-3xl mx-auto bg-white dark:bg-[#191919] border border-gray-200 dark:border-gray-700 rounded-xl">
      {/* Back */}
      <button
        onClick={onClose}
        className="flex items-center gap-2 px-4 py-3 text-[#10b981] border-b"
      >
        <ArrowLeft size={18} />
        Post
      </button>

      {/* Game Post */}
      <GamePost
        {...post}
        disableInteractions
        onOpenDetails={() => {}}
        onDeleteSuccess={() => {}}
      />

      {/* Comments */}
      <CommentSection
        postId={post._id}
        postOwnerId={post.user?._id}
        BACKEND_URL={BACKEND_URL}
      />
    </div>
  );
};

export default GamePostDetails;