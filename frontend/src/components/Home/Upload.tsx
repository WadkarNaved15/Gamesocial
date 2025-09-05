import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaUpload } from "react-icons/fa";

export default function UploadBox() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Selected file:", file);
      // ✅ Navigate to upload page with file name in state
      navigate("/upload", { state: { fileName: file.name } });
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-0">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload Rectangle */}
      <div className="w-full max-w-3xl mx-auto mt-4">
<button
  onClick={handleClick}
  className="min-w-full h-10 px-4 flex items-center justify-center 
  rounded-lg border border-red-300 bg-red-500 
  text-white text-sm font-medium tracking-wide 
  hover:bg-red-600 hover:border-red-400 transition"
>
   <FaUpload className="mr-2" />
  Upload
</button>
</div>
    </div>
  );
}
