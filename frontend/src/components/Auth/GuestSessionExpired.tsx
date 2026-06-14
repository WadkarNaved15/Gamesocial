import { useNavigate } from "react-router-dom";

export default function GuestAccessExpired() {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        @keyframes gaeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gaeFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gaeDotPulse {
          0%, 100% { box-shadow: 0 0 5px #62D4AE; }
          50%       { box-shadow: 0 0 14px #62D4AE, 0 0 24px rgba(98,212,174,0.28); }
        }
        @keyframes gaeGlow {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
        @keyframes gaeCheckIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .gae-bg     { animation: gaeFadeIn 0.4s ease forwards; }
        .gae-card   { animation: gaeSlideUp 0.5s cubic-bezier(.22,.68,0,1.15) forwards; }
        .gae-dot    { animation: gaeDotPulse 3s ease-in-out infinite; }
        .gae-glow   { animation: gaeGlow 4s ease-in-out infinite; }
        .gae-check  { animation: gaeCheckIn 0.4s ease forwards; opacity: 0; }
      `}</style>

      {/* Full feed replacement — not a modal, not dismissible */}
      <div
        className="gae-bg relative w-full flex items-center justify-center px-4 py-12"
        style={{ minHeight: '100%', background: '#050505' }}
      >
        {/* Ambient radial glow — top center */}
        <div
          className="gae-glow pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[340px]"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(98,212,174,0.1) 0%, transparent 70%)' }}
        />

        {/* Ambient glow — bottom */}
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[260px]"
          style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(36,73,62,0.18) 0%, transparent 70%)' }}
        />

        {/* Noise texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }}
        />

        {/* Card */}
        <div
          className="gae-card relative w-full max-w-[420px] rounded-[28px] border border-white/[0.07] overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #0e0e0e 0%, #090909 100%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(98,212,174,0.04)',
          }}
        >
          {/* Card inner top glow */}
          <div
            className="pointer-events-none absolute top-[-80px] left-1/2 -translate-x-1/2 w-[340px] h-[200px]"
            style={{ background: 'radial-gradient(ellipse, rgba(98,212,174,0.1) 0%, transparent 70%)' }}
          />

          {/* Card noise */}
          <div
            className="pointer-events-none absolute inset-0 rounded-[28px] opacity-[0.018] z-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: '128px 128px',
            }}
          />

          <div className="relative z-[1] p-7 sm:p-9">

            {/* Eyebrow */}
            <div
              className="inline-flex items-center gap-[6px] text-[10px] font-semibold tracking-[0.16em] uppercase text-[#4FA98B] bg-[#62D4AE]/[0.08] border border-[#62D4AE]/[0.18] px-[11px] py-[5px] rounded-full mb-5"
              style={{ animationDelay: '0.1s' }}
            >
              <span className="gae-dot w-[4px] h-[4px] rounded-full bg-[#62D4AE]" />
              Guest Access
            </div>

            {/* Headline */}
            <h2
              className="text-[clamp(26px,5vw,32px)] font-bold tracking-[-0.022em] leading-[1.1] mb-3"
              style={{
                background: 'linear-gradient(145deg, #ffffff 0%, rgba(255,255,255,0.52) 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Continue Exploring Rigzer
            </h2>

            {/* Description */}
            <p className="text-[14px] leading-[1.68] mb-7" style={{ color: 'rgba(255,255,255,0.44)' }}>
              You've reached the end of guest access. Create a free account to continue discovering games, creators, and communities across Rigzer.
            </p>

            {/* Divider */}
            <div
              className="h-px mb-6"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}
            />

            {/* Benefits */}
            <ul className="flex flex-col gap-[10px] mb-7">
              {[
                { label: 'Play games instantly',           delay: '0.15s' },
                { label: 'Follow creators',                delay: '0.22s' },
                { label: 'Build your personal library',    delay: '0.29s' },
                { label: 'Get personalized recommendations', delay: '0.36s' },
                { label: 'Track activity and progress',    delay: '0.43s' },
              ].map(({ label, delay }) => (
                <li
                  key={label}
                  className="gae-check flex items-center gap-[10px] text-[13.5px]"
                  style={{ color: 'rgba(255,255,255,0.65)', animationDelay: delay }}
                >
                  <span
                    className="flex-shrink-0 w-[18px] h-[18px] rounded-[5px] flex items-center justify-center"
                    style={{
                      background: 'rgba(98,212,174,0.1)',
                      border: '1px solid rgba(98,212,174,0.22)',
                    }}
                  >
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#62D4AE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1.5,5 4,7.5 8.5,2" />
                    </svg>
                  </span>
                  {label}
                </li>
              ))}
            </ul>

            {/* Divider */}
            <div
              className="h-px mb-6"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}
            />

            {/* Primary CTA */}
            <button
              onClick={() => navigate('/auth')}
              className="relative w-full py-[13px] rounded-xl text-[14px] font-semibold tracking-[0.01em] overflow-hidden transition-all duration-200 active:scale-[0.98] mb-[10px] group"
              style={{
                background: 'linear-gradient(135deg, #62D4AE 0%, #4FA98B 100%)',
                color: '#051a14',
              }}
            >
              <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/[0.09]" />
              Create Account
            </button>

            {/* Ghost CTA */}
            <button
              onClick={() => navigate('/auth?tab=login')}
              className="w-full py-[13px] rounded-xl text-[14px] font-medium tracking-[0.01em] transition-all duration-200 active:scale-[0.98]"
              style={{
                color: 'rgba(255,255,255,0.6)',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.09)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.18)';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.85)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.09)';
                (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)';
              }}
            >
              Log In
            </button>

          </div>
        </div>
      </div>
    </>
  );
}