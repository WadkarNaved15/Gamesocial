import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleUser, Bookmark, LogIn, LogOut, Bell, User } from "lucide-react";
import AccountSwitcherOverlay from "./AccountSwitchOverlay";
import { useUser } from "../../context/user";
import { useNotification } from "../../context/Notifications";

interface ProfileCoverProps {
  onOpenWishlist: () => void;
}
export default function ProfileCover({
  onOpenWishlist,
}: ProfileCoverProps) {
  const [accountOverlayOpen, setAccountOverlayOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const navigate = useNavigate();
  const { unreadCount } = useNotification();
  const { user, logout } = useUser();
  const userBio = user?.bio || "Bio goes here...";
  const isBioLong = userBio.length > 40;
  // If user is NOT logged in → Show login prompt card
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto">
        <div
          className="
            relative overflow-visible
            rounded-t-[0.5rem]

            bg-gradient-to-br
            from-white/[0.08]
            via-white/[0.04]
            to-white/[0.01]

            border border-white/10

            shadow-[0_8px_32px_rgba(0,0,0,0.45)]
            shadow-white/[0.02]

            transition-all duration-300

            before:absolute
            before:inset-0
            before:rounded-t-[0.5rem]
            before:pointer-events-none

            before:bg-gradient-to-b
            before:from-white/[0.12]
            before:via-white/[0.03]
            before:to-transparent
            "
        >

          <div
            className="
              absolute inset-0
              rounded-t-[0.5rem]
              pointer-events-none
              bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_45%)]
            "
          />

          <div
            className="
              absolute
              top-0
              left-1/2
              -translate-x-1/2
              h-24
              w-40
              bg-white/[0.05]
              rounded-full
              blur-3xl
              pointer-events-none
            "
          />
          {/* Content */}
          <div className="px-4 pt-5 pb-5 text-center">
            {/* Avatar */}
            <div className="mx-auto w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center mb-3">
              <User className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>

            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Welcome to Rigzer
            </h4>

            <p className="text-gray-400 text-sm mt-1">
              Login to access further services
            </p>

            {/* Action */}
            <div className="flex justify-center mt-4">
              <button
                onClick={() => navigate("/auth")}
                className="
                inline-flex items-center gap-2
                px-4 py-1.5 rounded-full
                bg-blue-600 hover:bg-blue-700
                text-white text-xs font-medium
                transition-all active:scale-95
              "
              >
                <User className="h-4 w-4" />
                Login / Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // Dynamic values to match your schema
  const bannerUrl = user?.banner || 'https://fastly.picsum.photos/id/299/800/200.jpg?hmac=xMdRbjiNM_IogJDEgKIJ0GeCxZ8nwOGd5_Wf_ODZ94s';

  const handleAvatarClick = (e: React.MouseEvent<HTMLImageElement>) => {
    setAnchorRect(e.currentTarget.getBoundingClientRect());
    setAccountOverlayOpen(true);
  };


  return (
    <div className="max-w-3xl mx-auto">
      <div
        className="
  relative overflow-hidden
  rounded-xl

  bg-white/[0.04]

  backdrop-blur-xl
  backdrop-saturate-150

  border border-white/10

  shadow-[0_8px_32px_rgba(0,0,0,0.45)]
  shadow-white/[0.02]

  transition-all duration-300

  before:absolute
  before:inset-0
  before:pointer-events-none

  before:bg-gradient-to-b
  before:from-white/[0.08]
  before:via-transparent
  before:to-transparent
"
      >
        <div
          className="
    absolute
    top-0
    left-0
    w-full
    h-px

    bg-gradient-to-r
    from-transparent
    via-white/30
    to-transparent

    z-20
  "
        />
        {/* Cover Image for profile */}
        <div className="relative rounded-t-[0.5rem]">
          <div
            className="w-full h-20 bg-cover bg-center rounded-t-[0.5rem]"
            style={{
              backgroundImage: `url(${bannerUrl})`,
              filter: "brightness(0.8) saturate(1.2)",
            }}
          />
          {/* Gradient Overlay - Adjusts based on mode */}
          <div
            className="
          absolute inset-0

          bg-gradient-to-b
          from-white/[0.02]
          via-black/10
          to-[#1e1e1e]
        "
          />

          {/* Profile Image Container */}
          <div className="absolute -bottom-8 left-4 flex items-end z-10">
            <div className="relative">
              <img
                src={user?.avatar || "/default_avatar.png"}
                alt="Profile"
                onClick={handleAvatarClick}
                className={`
  w-16 h-16
  rounded-full
  object-cover
  cursor-pointer
  border border-white/20

bg-white/[0.08]

shadow-[0_0_0_1px_rgba(255,255,255,0.08)]
shadow-[0_0_25px_rgba(255,255,255,0.10)]

  hover:brightness-95
  hover:scale-105

  transition-all duration-300

  ${accountOverlayOpen ? "opacity-0" : "opacity-100"}
`}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-10 px-4 pb-8 flex flex-col items-start">
          {/* Display Name */}
          <h4 className="text-md font-bold text-gray-900 dark:text-gray-100 leading-tight">
            {user?.displayName || user?.username || "John Developer"}
          </h4>

          {/* Username Handle */}
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5 lowercase">
            @{user?.username?.replace(/\s+/g, "") || "johndeveloper"}
          </p>

          {/* Bio */}
          <p className="text-gray-400 text-sm mt-3 break-words whitespace-pre-line max-w-full">
            {isBioLong && !bioExpanded
              ? `${userBio.slice(0, 40)}...`
              : userBio
            }
          </p>

          {/* Show More / Show Less Button */}
          {isBioLong && (
            <button
              onClick={() => setBioExpanded(!bioExpanded)}
              className="mt-1 text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline transition-all focus:outline-none"
            >
              {bioExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>

        {accountOverlayOpen && (
          <AccountSwitcherOverlay
            anchorRect={anchorRect}
            onClose={() => setAccountOverlayOpen(false)}
          />
        )}
      </div>
    </div>
  );
}