import {
    CircleUser,
    Bell,
    Bookmark,
    LogOut,
    LogIn,
    Home,
    Settings,
} from "lucide-react";

import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../../context/user";
import { useNotification } from "../../context/Notifications";

interface Props {
    onOpenWishlist: () => void;
}

export default function SidebarNavigation({
    onOpenWishlist,
}: Props) {
    const navigate = useNavigate();
    const location = useLocation();

    const { user, logout } = useUser();
    const { unreadCount } = useNotification();

    const items = [
        {
            icon: Home,
            label: "Home",
            path: "/",
            activePath: "/",
            action: () => navigate("/"),
        },
        {
            icon: CircleUser,
            label: "Profile",
            path: `/profile/${user?.username}`,
            activePath: "/profile",
            action: () => navigate(`/profile/${user?.username}`),
        },
        {
            icon: Bell,
            label: "Notifications",
            path: "/notifications",
            activePath: "/notifications",
            action: () => navigate("/notifications"),
        },
        {
            icon: Bookmark,
            label: "Saved",
            path: "/wishlist",
            activePath: "/wishlist",
            action: onOpenWishlist,
        },
        {
            icon: Settings,
            label: "Settings",
            path: "/settings",
            activePath: "/settings",
            action: () => {},
        },

    ];

    return (
        <div
            className="
        mt-3
        rounded-xl
        border border-white/10
        bg-white/[0.03]
        backdrop-blur-xl
        p-2
      "
        >
            <nav className="flex flex-col gap-1">
                {items.map((item) => {
                    const active =
                        item.activePath === "/"
                            ? location.pathname === "/"
                            : location.pathname.startsWith(item.activePath);

                    return (
                        <button
                            key={item.label}
                            onClick={item.action}
                            className={`
                relative
                flex items-center gap-3
                px-4 py-3
                rounded-lg
                transition-all

                ${active
                                    ? "bg-white/10 text-white border-l-2 border-green-400"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                                }
              `}
                        >
                            <item.icon size={18} />

                            <span className="text-sm font-medium">
                                {item.label}
                            </span>

                            {item.label === "Notifications" &&
                                unreadCount > 0 && (
                                    <span
                                        className="
                      ml-auto
                      min-w-[20px]
                      h-5
                      px-1
                      flex
                      items-center
                      justify-center
                      rounded-full
                      bg-red-500
                      text-white
                      text-xs
                    "
                                    >
                                        {unreadCount}
                                    </span>
                                )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}