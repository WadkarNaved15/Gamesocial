import { X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthGate } from "../../context/AuthGate";

export default function AuthGateModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, message, closeGate } = useAuthGate();

  if (!isOpen) return null;

  const handleDismiss = () => {
    closeGate();
    
    // If the gate was triggered while on a protected page, 
    // route them safely back to the home feed to prevent loop trapping.
    const isPublicFeed = location.pathname === "/";
    if (!isPublicFeed) {
      navigate("/", { replace: true });
    }
  };

  const goToAuth = (tab?: string) => {
    closeGate();
    navigate(tab === "login" ? "/auth?tab=login" : "/auth");
  };

  return (
    <>
      <style>{`
        @keyframes agFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes agSlideUp {
          from { opacity:0; transform:translateY(16px) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes agDotPulse {
          0%,100% { box-shadow: 0 0 5px #62D4AE; }
          50%      { box-shadow: 0 0 12px #62D4AE, 0 0 20px rgba(98,212,174,0.25); }
        }
        .ag-backdrop { animation: agFadeIn 0.2s ease forwards; }
        .ag-modal    { animation: agSlideUp 0.35s cubic-bezier(.22,.68,0,1.2) forwards; }
        .ag-dot      { animation: agDotPulse 3s ease-in-out infinite; }
      `}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        <div
          className="ag-backdrop absolute inset-0 bg-black/72 backdrop-blur-[6px]"
          onClick={handleDismiss}
        />

        {/* Modal */}
        <div className="ag-modal relative w-[92%] max-w-[400px] rounded-[24px] border border-white/[0.08] bg-[#090909] p-7 overflow-hidden shadow-2xl">

          {/* Ambient top glow */}
          <div className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[300px] h-[160px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(98,212,174,0.09) 0%, transparent 70%)' }}
          />

          {/* Noise texture */}
          <div
            className="absolute inset-0 rounded-[24px] opacity-[0.018] pointer-events-none z-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: '128px 128px',
            }}
          />

          {/* Close */}
          <button
            onClick={handleDismiss}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 w-[30px] h-[30px] rounded-full flex items-center justify-center bg-white/5 border border-white/[0.08] text-white/40 transition-all duration-200 hover:bg-white/10 hover:border-white/20 hover:text-white/80"
          >
            <X size={14} />
          </button>

          {/* ── Content ── */}
          <div className="relative z-[1]">
            {/* Heading */}
            <h2
              className="text-[26px] font-bold tracking-[-0.02em] leading-[1.1] mb-[10px]"
              style={{
                background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.55) 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Join Rigzer
            </h2>

            {/* Description */}
            <p className="text-[14px] leading-[1.65] text-white/48 mb-[22px]">
              {message || "Sign up to unlock the full platform — play games, follow creators, and build your library."}
            </p>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {[
                { label: "Play instantly",   icon: <PlayIcon /> },
                { label: "Follow creators",  icon: <FollowIcon /> },
                { label: "Interactive feed", icon: <FeedIcon /> },
                { label: "Save favourites",  icon: <StarIcon /> },
              ].map(({ label, icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 text-[13px] text-white/60 bg-white/[0.03] border border-white/[0.06] rounded-[10px] px-3 py-[9px]"
                >
                  <span className="w-[18px] h-[18px] rounded-[5px] bg-[#62D4AE]/[0.12] border border-[#62D4AE]/20 flex items-center justify-center flex-shrink-0 text-[#62D4AE]">
                    {icon}
                  </span>
                  {label}
                </div>
              ))}
            </div>

            {/* Divider */}
            <div
              className="h-px mb-5"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }}
            />

            {/* Primary CTA */}
            <button
              onClick={() => goToAuth()}
              className="relative w-full py-3 rounded-xl text-[14px] font-semibold tracking-[0.01em] text-[#051a14] overflow-hidden transition-all duration-200 active:scale-[0.98] mb-[10px]"
              style={{ background: 'linear-gradient(135deg, #62D4AE 0%, #4FA98B 100%)' }}
            >
              <span className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-200 bg-white/[0.08]" />
              Create Account
            </button>

            {/* Ghost CTA */}
            <button
              onClick={() => goToAuth("login")}
              className="w-full py-3 rounded-xl text-[14px] font-medium tracking-[0.01em] text-white/60 bg-white/[0.03] border border-white/10 transition-all duration-200 hover:bg-white/[0.06] hover:border-white/20 hover:text-white/85 active:scale-[0.98]"
            >
              Log In
            </button>

            {/* Fine print */}
            <p className="text-center text-[11px] text-white/20 tracking-[0.04em] mt-4">
              Free to join &nbsp;·&nbsp; No credit card required
            </p>

          </div>
        </div>
      </div>
    </>
  );
}

// ── Icon sub-components (unchanged) ─────────────────────────

function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="2,1 10,6 2,11" />
    </svg>
  );
}

function FollowIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="4" r="2.5" />
      <path d="M1 11c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 1l1.5 3 3.5.5-2.5 2.5.6 3.5L6 9l-3.1 1.5.6-3.5L1 4.5 4.5 4z" />
    </svg>
  );
}

function FeedIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="10" height="8" rx="1.5" />
      <path d="M1 5h10M4 2v3M8 2v3" />
    </svg>
  );
}