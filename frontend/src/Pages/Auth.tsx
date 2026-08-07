import React, { useState, useEffect, useRef } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from "react-router-dom";
import { consumeRedirect } from '../utils/authRedirect.js';
import axios from 'axios';
import { useUser } from "../context/user.js";
import LegalModal from './LegalModal';
import Logo from "../assets/Icon.svg?react";
import LoginForm from '../components/Auth/LoginForm';
import RegisterForm from '../components/Auth/RegisterForm';

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'google-setup';

const FEATURES = [
  { id: 1, title: "Embed 3D Models", desc: "Seamlessly integrate interactive 3D creations directly in your feed." },
  { id: 2, title: "Cloud-Powered Games", desc: "Play, share, and experience high-performance gaming instantly." },
  { id: 3, title: "Code-In Creator Pockets", desc: "Build, customize, and monetize your space with direct code access." }
];

export default function Auth() {
  const { user, loading } = useUser();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const [mode, setMode] = useState<AuthMode>('login');
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | null>(null);
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const addMode = searchParams.get("add") === "true";
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [googleTempToken, setGoogleTempToken] = useState("");
  const [googleDisplayName, setGoogleDisplayName] = useState("");

  // Forgot password state
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Handle returning from Google OAuth for a NEW user
  useEffect(() => {
    const isGoogleSetup = searchParams.get("googleSetup") === "true";
    const token = searchParams.get("tempToken");
    const name = searchParams.get("name");

    if (isGoogleSetup && token) {
      setMode("google-setup");
      setGoogleTempToken(token);
      if (name) {
        setGoogleDisplayName(decodeURIComponent(name));
      }

      // Clean up URL to hide token
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Background Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0, driftT = 0, animId: number;
    let particles: Array<{
      x: number; y: number; r: number; opacity: number;
      vx: number; vy: number; flicker: number; flickerSpeed: number;
    }> = [];

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };

    const initParticles = () => {
      particles = [];
      const count = Math.min(80, Math.floor((W * H) / 12000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.4 + 0.1,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.12,
          flicker: Math.random() * Math.PI * 2,
          flickerSpeed: 0.01 + Math.random() * 0.02,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const ox = Math.sin(driftT * 0.0004) * 100;
      const oy = Math.cos(driftT * 0.0003) * 80;

      const g1 = ctx.createRadialGradient(W * 0.3 + ox, H * 0.5 + oy, 0, W * 0.3 + ox, H * 0.5 + oy, Math.max(W, H) * 0.8);
      g1.addColorStop(0, 'rgba(36,73,62,0.4)');
      g1.addColorStop(0.5, 'rgba(15,35,30,0.15)');
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

      const g2 = ctx.createRadialGradient(W * 0.8 - ox, H * 0.9 - oy, 0, W * 0.8 - ox, H * 0.9 - oy, W * 0.6);
      g2.addColorStop(0, 'rgba(98,212,174,0.08)');
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(98,212,174,${0.15 * (1 - dist / 140)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      particles.forEach(p => {
        p.flicker += p.flickerSpeed;
        const a = p.opacity * (0.5 + 0.5 * Math.sin(p.flicker));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(98,212,174,${a.toFixed(3)})`;
        ctx.fill();
        p.x += p.vx; p.y += p.vy;

        if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
      });

      driftT++;
      animId = requestAnimationFrame(draw);
    };

    const onResize = () => { resize(); initParticles(); };
    window.addEventListener('resize', onResize);
    resize(); initParticles(); draw();
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(animId); };
  }, []);

  useEffect(() => {
    if (user && !loading && !addMode) {
      const redirect = consumeRedirect();

      navigate(redirect || "/", {
        replace: true,
      });
    }
  }, [user, loading, addMode, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/auth/forgot-password`, { email: resetEmail });
      setResetSent(true);
    } catch (err) {
      setResetSent(true);
    } finally {
      setResetLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'signup' : 'login');
  };

  return (
    <div className="fixed inset-0 bg-[#080A09] text-white overflow-hidden font-sans z-[9999] flex flex-col md:flex-row">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none" />
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, transparent 20%, black 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 20%, black 100%)'
        }}
      />
      <div className="absolute inset-0 z-[2] pointer-events-none bg-[radial-gradient(ellipse_90%_100%_at_50%_50%,transparent_30%,rgba(4,6,5,0.85)_100%)]" />

      {/* ── LEFT PANE ── */}
      <div className="relative z-10 hidden md:flex flex-col flex-1 p-12 lg:p-16 justify-between">
        <div className="flex items-center gap-3 animate-fade-up">
          <Logo className="w-8 h-8" style={{ color: "#62D4AE" }} />
          <span className="text-xl font-bold tracking-[0.1em] uppercase text-white">Rigzer</span>
        </div>
        <div className="max-w-2xl animate-fade-up pb-8" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-3xl lg:text-4xl font-bold leading-tight tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-br from-white to-white/70">
            The Next-Generation Social Interactive Media Platform.
          </h1>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-x-3 gap-y-3">
              {FEATURES.map((feature) => (
                <div key={feature.id} className="relative">
                  <button
                    onClick={() => setActiveFeature(activeFeature === feature.id ? null : feature.id)}
                    className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-full transition-all duration-300 border ${
                      activeFeature === feature.id
                        ? 'bg-[#62D4AE]/10 border-[#62D4AE]/30 text-white'
                        : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Plus
                      className={`w-4 h-4 text-[#62D4AE] transition-transform duration-300 ease-in-out ${
                        activeFeature === feature.id ? 'rotate-45' : 'rotate-0 group-hover:scale-110'
                      }`}
                    />
                    <span className="text-[14px] font-medium">{feature.title}</span>
                  </button>
                </div>
              ))}
            </div>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${activeFeature !== null ? 'max-h-24 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
              <div className="pl-4 border-l-2 border-[#62D4AE]/30 py-1">
                <p className="text-[14.5px] text-white/70 leading-relaxed">
                  {FEATURES.find(f => f.id === activeFeature)?.desc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANE (Transparent / Borderless Floating Form Area) ── */}
      <div className="relative z-10 w-full md:w-[480px] lg:w-[540px] bg-transparent min-h-screen flex flex-col justify-center px-8 sm:px-12 py-12 overflow-y-auto">
        <div className="flex md:hidden items-center gap-3 mb-10">
          <Logo className="w-7 h-7" style={{ color: "#62D4AE" }} />
          <span className="text-lg font-bold tracking-[0.1em] uppercase text-white">Rigzer</span>
        </div>

        {mode === 'login' && (
          <LoginForm
            onSwitchToSignup={toggleMode}
            onForgotPassword={() => setMode('forgot-password')}
          />
        )}

        {mode === 'signup' && (
          <RegisterForm
            variant="signup"
            onSwitchToLogin={toggleMode}
            onOpenLegalModal={setActiveModal}
          />
        )}

        {mode === 'google-setup' && (
          <RegisterForm
            variant="google-setup"
            googleTempToken={googleTempToken}
            initialDisplayName={googleDisplayName}
            onOpenLegalModal={setActiveModal}
          />
        )}

        {mode === 'forgot-password' && (
          resetSent ? (
            <div className="text-center space-y-6 animate-fade-up">
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-white/80 text-[14px] leading-relaxed">
                If an account exists with <strong className="text-[#62D4AE]">{resetEmail}</strong>, you will receive a password reset link shortly.
              </div>
              <button
                type="button" onClick={() => { setMode('login'); setResetSent(false); setResetEmail(""); }}
                className="group relative w-full overflow-hidden inline-flex items-center justify-center gap-2 text-[14px] font-medium px-4 py-3 rounded-lg cursor-pointer bg-[#62D4AE]/10 border border-[#62D4AE]/40 text-[#62D4AE] transition-all duration-200 outline-none hover:bg-[#62D4AE]/20 hover:border-[#62D4AE]/70 hover:text-[#8de8ca] hover:shadow-[0_0_24px_rgba(98,212,174,0.18),inset_0_0_12px_rgba(98,212,174,0.05)] active:scale-[0.98]"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 animate-fade-up">
                    <div className="mb-6">
                      <h1 className="font-headline text-2xl sm:text-3xl text-white uppercase tracking-[0.15em] text-left">
                        Reset Access
                      </h1>
                      <div className="mt-1 flex items-center gap-2 text-sm sm:text-sm text-gray-300">
                        <span>Enter your email to recieve a reset link</span>
                      </div>
                    </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white/70">Email address</label>
                <div className="relative group">
                  <input
                    type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-4 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE]/50 focus:ring-1 focus:ring-[#62D4AE]/50 text-white placeholder-white/20 transition-all text-sm"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <button
                type="submit" disabled={resetLoading}
                className="group relative w-full overflow-hidden inline-flex items-center justify-center gap-2 text-[14px] font-medium px-4 py-3 mt-2 rounded-lg cursor-pointer bg-[#62D4AE]/10 border border-[#62D4AE]/40 text-[#62D4AE] transition-all duration-200 outline-none hover:bg-[#62D4AE]/20 hover:border-[#62D4AE]/70 hover:text-[#8de8ca] hover:shadow-[0_0_24px_rgba(98,212,174,0.18),inset_0_0_12px_rgba(98,212,174,0.05)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {resetLoading ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Send Reset Link'}
                </span>
              </button>
              <button
                type="button" onClick={() => setMode('login')}
                className="w-full mt-4 text-sm text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </button>
            </form>
          )
        )}
      </div>

      <LegalModal type={activeModal} onClose={() => setActiveModal(null)} />

      <style>{`
      .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fadeUp 0.9s ease forwards; opacity: 0; }
        select { color-scheme: dark; }
      `}</style>
    </div>
  );
}