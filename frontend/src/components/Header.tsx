import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Moon,
  Search,
  Sun,
  Home,
  UserRound,
  BriefcaseBusiness,
  LogOut,
  LogIn,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useUser } from "../context/user.js";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export function Header() {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useUser();
    const [scrollY, setScrollY] = useState(0);

     useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

    const logoTranslateX = scrollY > 50 ? "calc(50vw - 68%)" : "0";

  const handleLogout = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/Logout`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        logout();
        console.log("Logout successful");
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#1C1C1C] border-b border-gray-200 dark:border-gray-800 h-[50px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[50px]">
          {/* Left section */}
          <div className="flex items-center w-[50%]">
           <div
              className="flex-shrink-0"
              style={{
                transform: `translateX(${logoTranslateX})`,
                transition: "transform 0.3s ease-out",
              }}
            >
              <Link
                to="/"
                className="text-3xl dark:text-[#3D7A6E] tracking-wide"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  letterSpacing: "0.05em",
                }}
                onClick={() =>
                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  })
                }
              >
                HESTER
              </Link>
            </div>

            {/* <div className="flex-1 max-w-2xl mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search posts, games, or users..."
                  className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 dark:text-white border-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div> */}
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-4">
            {/* {[
              { icon: Home, label: "Home" },
              { icon: UserRound, label: "Profile" },
              { icon: BriefcaseBusiness, label: "Jobs" },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="flex items-center gap-1 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Icon className="h-5 w-5 text-gray-600 dark:text-white" />
                <span className="text-base font-semibold text-gray-600 dark:text-white">
                  {label}
                </span>
              </button>
            ))}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <Sun className="h-5 w-5 text-gray-600 dark:text-white" />
              ) : (
                <Moon className="h-5 w-5 text-gray-600 dark:text-white" />
              )}
            </button> */}

            <button
              onClick={user ? handleLogout : () => (window.location.href = "/auth")}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={user ? "Logout" : "Login"}
            >
              {user ? (
                <LogOut className="h-5 w-5 text-gray-600 dark:text-white" />
              ) : (
                <LogIn className="h-5 w-5 text-gray-600 dark:text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
