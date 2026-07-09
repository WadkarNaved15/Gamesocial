import { useNavigate } from "react-router-dom";

export default function GuestAccessExpired() {
  const navigate = useNavigate();

  const benefits = [
    "Play games instantly",
    "Follow your favorite creators",
    "Build your personal library",
    "Get personalized recommendations",
  ];

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0a] p-4">
      <div className="w-full max-w-[440px] overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-2xl">
        
        {/* Subtle Brand Accent Bar */}
        <div className="h-1.5 w-full bg-[#62D4AE]" />

        <div className="p-8">
          <h2 className="mb-3 flex items-center text-2xl font-bold tracking-tight text-white">
            Guest Access Ended
          </h2>
          
          <p className="mb-8 text-sm leading-relaxed text-neutral-400">
            You've reached the end of your guest session. Create a free account to continue discovering games, creators, and communities across Rigzer.
          </p>

          {/* Styled Benefits List */}
          <div className="mb-8 space-y-3 rounded-xl border border-white/5 bg-white/5 p-5">
            {benefits.map((text, i) => (
              <div key={i} className="text-sm text-neutral-300">
                {text}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/auth')}
              className="w-full rounded-xl bg-[#62D4AE] py-3 text-sm font-semibold text-[#051a14] transition-all hover:bg-[#52be9a] active:scale-[0.98]"
            >
              Create Free Account
            </button>
            
            <button
              onClick={() => navigate('/auth?tab=login')}
              className="w-full rounded-xl border border-white/10 bg-transparent py-3 text-sm font-medium text-white transition-all hover:bg-white/5 active:scale-[0.98]"
            >
              Log In to Existing Account
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}