// postModal/index.tsx
import { useState } from "react";
import PostTypeHeader from "./PostTypeHeader";
import ActivePostForm from "./ActivePostForm";
import { PostType } from "../../types/postTypes";
import { useNavigate } from "react-router-dom";

const PostModalPage = () => {
  const [postType, setPostType] = useState<PostType>("model");
  const navigate = useNavigate();
  
  return (
    <div className="w-full min-h-screen flex flex-row relative justify-center md:justify-start">
      
      {/* Sidebar - Added margin-left to push the icons right to follow the form */}
      <aside
        className="
          relative
          z-50
          w-16 md:w-20
          ml-4 md:ml-16
          flex flex-col items-center
          py-6
          sticky top-0
          h-screen
          overflow-visible
        "
      >
        <PostTypeHeader 
          active={postType} 
          onChange={setPostType} 
          onCancel={() => navigate(-1)}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Adjusted left margin so it sits comfortably next to the shifted sidebar */}
        <div className="max-w-2xl ml-2 md:ml-4 py-8 pl-2 pr-8">
          <ActivePostForm
            postType={postType}
            onCancel={() => navigate(-1)}
          />
        </div>
      </main>
    </div>
  );
};

export default PostModalPage;