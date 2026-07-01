// src/components/OrbBackground.tsx

export default function OrbBackground() {
  return (
    <>
      {/* ── Animated background — fixed, behind everything ── */}
      <style>{`
        @keyframes orb-drift-1 {
          0%   { transform: translate(0px,    0px)    scale(1);    }
          33%  { transform: translate(60px,  -40px)   scale(1.08); }
          66%  { transform: translate(-30px,  50px)   scale(0.95); }
          100% { transform: translate(0px,    0px)    scale(1);    }
        }
        @keyframes orb-drift-2 {
          0%   { transform: translate(0px,   0px)   scale(1);    }
          40%  { transform: translate(-50px, 70px)   scale(1.1);  }
          75%  { transform: translate(40px, -30px)   scale(0.92); }
          100% { transform: translate(0px,   0px)   scale(1);    }
        }
        @keyframes orb-drift-3 {
          0%   { transform: translate(0px,  0px)   scale(1);    }
          50%  { transform: translate(30px, 60px)   scale(1.05); }
          100% { transform: translate(0px,  0px)   scale(1);    }
        }
        @keyframes orb-drift-4 {
          0%   { transform: translate(0px,   0px)   scale(1);    }
          45%  { transform: translate(-60px,-50px)   scale(1.12); }
          100% { transform: translate(0px,   0px)   scale(1);    }
        }
      `}</style>

      {/*
       * Fixed orb layer — position:fixed so it never scrolls away.
       * pointer-events:none so it doesn't intercept clicks.
       * z-index:0 (parent will handle layering).
       */}
      <div
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        {/* Teal orb — top-left */}
        <div
          style={{
            position: "absolute",
            top: "-10%",
            left: "-5%",
            width: "44vw",
            height: "44vw",
            maxWidth: 560,
            maxHeight: 560,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(61,122,110,0.22) 0%, transparent 58%)",
            animation: "orb-drift-1 18s ease-in-out infinite",
            filter: "blur(2px)",
          }}
        />
        {/* Purple orb — top-right */}
        <div
          style={{
            position: "absolute",
            top: "5%",
            right: "-10%",
            width: "36vw",
            height: "36vw",
            maxWidth: 464,
            maxHeight: 464,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(100,60,180,0.16) 0%, transparent 70%)",
            animation: "orb-drift-2 22s ease-in-out infinite",
            filter: "blur(2px)",
          }}
        />
        {/* Deep blue orb — mid-screen */}
        <div
          style={{
            position: "absolute",
            top: "38%",
            left: "20%",
            width: "32vw",
            height: "32vw",
            maxWidth: 400,
            maxHeight: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(30,80,160,0.15) 0%, transparent 70%)",
            animation: "orb-drift-3 26s ease-in-out infinite",
            filter: "blur(2px)",
          }}
        />
        {/* Teal/cyan accent orb — bottom-right */}
        {/* <div
          style={{
            position: "absolute",
            bottom: "-5%",
            right: "5%",
            width: "30.4vw",
            height: "30.4vw",
            maxWidth: 384,
            maxHeight: 384,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,180,150,0.16) 0%, transparent 70%)",
            animation: "orb-drift-4 20s ease-in-out infinite",
            filter: "blur(2px)",
          }}
        /> */}
        {/* Top dark fade */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "25vh",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 45%, transparent 100%)",
          }}
        />
        {/* Subtle warm accent — bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            left: "-8%",
            width: "24vw",
            height: "24vw",
            maxWidth: 304,
            maxHeight: 304,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(120,60,200,0.12) 0%, transparent 70%)",
            animation: "orb-drift-1 30s ease-in-out infinite reverse",
            filter: "blur(2px)",
          }}
        />
      </div>
    </>
  );
}