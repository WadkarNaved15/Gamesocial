import { X, UserPlus, LogIn } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthGate } from "../../context/AuthGate";
import { saveRedirect } from "../../utils/authRedirect";
export default function AuthGateModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, message, closeGate } = useAuthGate();

  if (!isOpen) return null;

  const handleDismiss = () => {
    closeGate();
    
    // Safely route back to the home feed if triggered on a protected page
    if (location.pathname !== "/") {
      navigate("/", { replace: true });
    }
  };

  const goToAuth = (tab?: string) => {
    saveRedirect(location.pathname + location.search + location.hash);
    closeGate();
    navigate(tab === "login" ? "/auth?tab=login" : "/auth");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm transition-opacity duration-300">
      <div className="relative w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#121212] shadow-2xl">
        
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Join Rigzer
          </h2>
          <button
            onClick={handleDismiss}
            aria-label="Close"
            className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Section */}
        <div className="p-6">
          <p className="mb-7 text-sm leading-relaxed text-neutral-400">
            {message || "Sign up to unlock the full platform — play games, follow creators, and build your library."}
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => goToAuth()}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#62D4AE] py-3 text-sm font-semibold text-[#051a14] transition-all hover:bg-[#52be9a] active:scale-[0.98]"
            >
              <UserPlus size={18} className="transition-transform group-hover:scale-110" />
              Create Account
            </button>
            
            <button
              onClick={() => goToAuth("login")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white transition-all hover:bg-white/10 active:scale-[0.98]"
            >
              <LogIn size={18} />
              Log In
            </button>
          </div>
          
        </div>
        
      </div>
    </div>
  );
}