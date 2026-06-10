import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleUser, Bookmark, LogIn, LogOut, Bell, User } from "lucide-react";
import AccountSwitcherOverlay from "./AccountSwitchOverlay";
import { useUser } from "../../context/user";
import { useNotification } from "../../context/Notifications";

interface ProfileCoverProps {
  onOpenWishlist: () => void;
}

export default function ProfileCover({ onOpenWishlist }: ProfileCoverProps) {
  const [accountOverlayOpen, setAccountOverlayOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const navigate = useNavigate();
  const { unreadCount } = useNotification();
  const { user, logout } = useUser();

  // Shared glass card style — strong visible glassmorphism on dark #191919/#1e1e1e bg
  const glassCardClass = `
    relative overflow-visible
    rounded-t-[0.5rem]
    transition-all duration-300
    border border-white/20
    border-t border-white/30
  `;

  const glassCardStyle: React.CSSProperties = {
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)",
    backdropFilter: "blur(20px) saturate(180%) brightness(1.08)",
    WebkitBackdropFilter: "blur(20px) saturate(180%) brightness(1.08)",
    boxShadow:
      "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)",
  };

  // ─── Not logged in ───────────────────────────────────────────────
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className={glassCardClass} style={glassCardStyle}>

          {/* Top-edge shimmer line */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
            }}
          />

          {/* Glow orb */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-24 rounded-full pointer-events-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              filter: "blur(32px)",
            }}
          />

          {/* Content */}
          <div className="px-4 pt-5 pb-5 text-center relative z-10">
            <div className="mx-auto w-14 h-14 rounded-full bg-white/10 border border-white/15 flex items-center justify-center mb-3">
              <User className="h-8 w-8 text-white/50" />
            </div>

            <h4 className="text-base font-bold text-white/90">
              Welcome to Rigzer
            </h4>

            <p className="text-white/45 text-sm mt-1">
              Login to access further services
            </p>

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

  // ─── Logged in ───────────────────────────────────────────────────
  const bannerUrl =
    user?.banner ||
    "https://fastly.picsum.photos/id/299/800/200.jpg?hmac=xMdRbjiNM_IogJDEgKIJ0GeCxZ8nwOGd5_Wf_ODZ94s";

  const handleAvatarClick = (e: React.MouseEvent<HTMLImageElement>) => {
    setAnchorRect(e.currentTarget.getBoundingClientRect());
    setAccountOverlayOpen(true);
  };

  const navItems = [
    {
      icon: CircleUser,
      label: "Profile",
      action: () => navigate(`/profile/${user?.username}`),
    },
    {
      icon: Bell,
      label: "Notifications",
      action: () => navigate("/notifications"),
    },
    { icon: Bookmark, label: "Saved", action: onOpenWishlist },
    user
      ? { icon: LogOut, label: "Logout", action: logout }
      : { icon: LogIn, label: "Login", action: () => navigate("/auth") },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className={glassCardClass} style={glassCardStyle}>

        {/* Top-edge shimmer line */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
          }}
        />

        {/* Glow orb */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-24 rounded-full pointer-events-none z-0"
          style={{
            background: "rgba(255,255,255,0.06)",
            filter: "blur(32px)",
          }}
        />

        {/* Banner */}
        <div className="relative rounded-t-[0.5rem]">
          <div
            className="w-full h-20 bg-cover bg-center rounded-t-[0.5rem]"
            style={{
              backgroundImage: `url(${bannerUrl})`,
              filter: "brightness(0.8) saturate(1.2)",
            }}
          />

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(0,0,0,0.12), #1e1e1e)",
            }}
          />

          {/* Avatar */}
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
                  hover:brightness-95
                  hover:scale-105
                  transition-all duration-300
                  ${accountOverlayOpen ? "opacity-0" : "opacity-100"}
                `}
                style={{
                  border: "1px solid rgba(255,255,255,0.22)",
                  boxShadow:
                    "0 0 0 1px rgba(255,255,255,0.06), 0 0 20px rgba(255,255,255,0.08)",
                  backdropFilter: "blur(8px)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Name / Bio */}
        <div className="mt-10 px-4 relative z-10">
          <h4 className="text-md font-bold text-white/90">
            {user?.username || "John Developer"}
          </h4>
          <p className="text-white/50 text-sm">
            {user?.bio || "Game Developer"}
          </p>
        </div>

        {/* Nav buttons */}
        <div className="flex mt-4 pb-4 items-center justify-center space-x-2 relative z-10">
          {navItems.map((item, idx) => (
            <button
              key={idx}
              onClick={item.action}
              title={item.label}
              className="
                p-2 rounded-full transition-all active:scale-90 group relative
              "
              style={{
                background: "transparent",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.1)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "transparent")
              }
            >
              <item.icon
                className="h-5 w-5 transition-colors"
                style={{ color: "rgba(255,255,255,0.45)" }}
              />

              {/* Notification badge */}
              {item.label === "Notifications" && unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1
                  flex items-center justify-center rounded-full bg-red-500
                  text-white text-[10px] font-bold"
                  style={{ border: "2px solid #191919" }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
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