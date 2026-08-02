import { FaUpload , FaPlus } from "react-icons/fa";

export default function UploadBox({
  onUploadClick,
}: {
  onUploadClick: () => void;
}) {
  return (
    <div className="w-full mt-3">
      <button
        onClick={onUploadClick}
        className="
    w-full
    py-2

    flex
    items-center
    justify-center
    gap-2

    rounded-full

    bg-white
    text-black

    font-semibold

    transition-all
    duration-200

    hover:bg-gray-100
    hover:scale-[1.02]

    active:scale-95

    shadow-[0_8px_25px_rgba(255,255,255,0.15)]
  "
      >
        <FaPlus size={14} />
        <span>Post</span>
      </button>
    </div>
  );
}