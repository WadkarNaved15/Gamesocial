import { FaUpload } from "react-icons/fa";

export default function UploadBox({
  onUploadClick,
}: {
  onUploadClick: () => void;
}) {
  return (
    <div className="w-full max-w-3xl mx-auto mt-8 sticky top-4 z-20">
      <button
        onClick={onUploadClick}
        className="
          w-full h-10 px-4 flex items-center justify-center
          rounded-lg border-[1px] transition-all duration-200
          bg-[#F9FAFB] border-[#E0E0E5] text-gray-700 hover:bg-gray-100
          dark:bg-[#191919] dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#1e1e1e]
          active:scale-[0.98] font-medium tracking-wide
        "
      >
        <FaUpload className="mr-2 text-sky-500" />
        <span>Upload</span>
      </button>
    </div>
  );
}