import { FaUpload } from "react-icons/fa";

export default function UploadBox({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <div className="w-full max-w-3xl mx-auto mt-4">
      <button
        onClick={onUploadClick}
        className="min-w-full h-10 px-4 flex items-center justify-center 
        rounded-lg border border-red-300 bg-red-500 
        text-white text-sm font-medium tracking-wide 
        hover:bg-red-600 hover:border-red-400 transition"
      >
        <FaUpload className="mr-2" />
        Upload
      </button>
    </div>
  );
}

