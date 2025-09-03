import { useNavigate } from "react-router-dom";
import { CircleUser, Gamepad2, UserRound, Bookmark } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto">
      {/* Cover Image and Avatar */}
      <div className="relative">
        <img
          src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1350&q=80"
          alt="Cover"
          className="w-full h-20 object-cover rounded-xl"
        />
        <div className="absolute -bottom-10 left-5">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
            alt="Profile"
            className="cursor-pointer w-20 h-20 rounded-full border-4 border-white dark:border-gray-900"
            onClick={() => navigate("/profile")}
          />
        </div>
      </div>

      {/* User Info */}
      <div className="mt-10 px-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">John Developer</h4>
            <p className="text-gray-500 dark:text-gray-400">Game Developer</p>
          </div>
          {/* Uncomment if edit profile needed
          <button className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors duration-200 flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Edit Profile</span>
          </button> 
          */}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex mt-4 items-center justify-center space-x-2">
        {[CircleUser, Gamepad2, UserRound, Bookmark].map((Icon, idx) => (
          <button
            key={idx}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-purple-600/10"
          >
            <Icon className="h-6 w-6 text-gray-600 dark:text-purple-600" />
          </button>
        ))}
      </div>
    </div>
  );
}
