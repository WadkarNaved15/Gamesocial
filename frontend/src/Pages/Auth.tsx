import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2, Plus, ArrowLeft } from 'lucide-react';
import { GoogleOAuthProvider } from "@react-oauth/google";
import { saveAccount } from "../utils/accountRegistry.js";
import { useNavigate, useLocation } from "react-router-dom";
import axios from 'axios';
import { useUser } from "../context/user.js";
import LegalModal from './LegalModal';
import Logo from "../assets/Icon.svg?react";

type AuthMode = 'login' | 'signup' | 'forgot-password';

const FEATURES = [
  { id: 1, title: "Embed 3D Models", desc: "Seamlessly integrate interactive 3D creations directly in your feed." },
  { id: 2, title: "Cloud-Powered Games", desc: "Play, share, and experience high-performance gaming instantly." },
  { id: 3, title: "Code-In Creator Pockets", desc: "Build, customize, and monetize your space with direct code access." }
];

export default function Auth() {
  const { login, user, loading } = useUser();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [status, setStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToLegal, setAgreedToLegal] = useState(false);
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | null>(null);
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const addMode = searchParams.get("add") === "true";
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  // Forgot Password State
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // ENHANCED CANVAS BACKGROUND ANIMATION
  // ─────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────
  // AUTH LOGIC
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user && !loading && !addMode) {
      navigate("/");
    }
  }, [user, loading, addMode, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (status) setStatus(null);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      await axios.post(`${BACKEND_URL}/api/auth/forgot-password`, { email: resetEmail });
      setResetSent(true);
    } catch (err) {
      // Intentionally silent for security; mimic success
      setResetSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);
    try {
      if (mode === 'signup' && formData.password !== formData.confirmPassword) {
        setStatus({ type: 'error', message: "Passwords do not match." });
        setIsLoading(false);
        return;
      }

      if (mode === 'signup' && !agreedToLegal) {
        setStatus({ type: 'error', message: "You must agree to our Terms of Service and Privacy Policy to sign up." });
        setIsLoading(false);
        return;
      }

      if (mode === 'login') {
        const response = await axios.post(
          `${BACKEND_URL}/api/auth/login`,
          { emailOrUsername: formData.email, password: formData.password },
          { withCredentials: true }
        );

        if (response.status === 200) {
          const user = response.data.user;
          saveAccount({ userId: user._id, username: user.username, avatar: user.avatar });
          login(user);
          navigate("/");
        }
      } else if (mode === 'signup') {
        const response = await axios.post(`${BACKEND_URL}/api/auth/register`, {
          username: formData.username,
          email: formData.email,
          password: formData.password
        }, { withCredentials: true });
        
        if (response.data.requiresVerification) {
          setPendingEmail(formData.email);
          setShowOTP(true);

          setStatus({
            type: "success",
            message: "Verification code sent to your email."
          });

          return;
        }
      }
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        if (err.response?.data?.requiresVerification) {
          navigate(`/verify-email?email=${formData.email}`);
          return;
        }
        setStatus({ type: 'error', message: err.response?.data?.error || "Something went wrong. Please try again." });
      } else {
        setStatus({ type: 'error', message: "An unexpected error occurred." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      setIsLoading(true);
      setStatus(null);

      const response = await axios.post(
        `${BACKEND_URL}/api/auth/verify-email`,
        { email: pendingEmail, otp },
        { withCredentials: true }
      );

      const user = response.data.user;

      saveAccount({
        userId: user._id,
        username: user.username,
        avatar: user.avatar,
      });

      login(user);
      navigate("/");

    } catch (err: any) {
      setStatus({
        type: "error",
        message:
          err.response?.data?.error ||
          "Invalid or expired verification code",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (mode === 'signup' && !agreedToLegal) {
      setStatus({ type: 'error', message: "You must agree to our Terms of Service and Privacy Policy to sign up." });
      return;
    }
    window.location.href = `${BACKEND_URL}/api/auth/google`;
  };

  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'signup' : 'login');
    setFormData({ username: '', email: '', password: '', confirmPassword: '' });
    setStatus(null);
    setAgreedToLegal(false);
    setActiveModal(null);
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-[#080A09] text-white overflow-hidden font-sans z-[9999] flex flex-col md:flex-row">
      
      {/* Background Canvas Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none" />
      
      {/* Geometric Overlay Grid for depth */}
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
      
      {/* Vignette */}
      <div className="absolute inset-0 z-[2] pointer-events-none bg-[radial-gradient(ellipse_90%_100%_at_50%_50%,transparent_30%,rgba(4,6,5,0.85)_100%)]" />

      {/* ── LEFT PANE: Feature Display ── */}
      <div className="relative z-10 hidden md:flex flex-col flex-1 p-12 lg:p-16 justify-between">
        
        {/* Top: Logo */}
        <div className="flex items-center gap-3 animate-fade-up">
          <Logo className="w-8 h-8" style={{ color: "#62D4AE" }} />
          <span className="text-xl font-bold tracking-[0.1em] uppercase text-white">Rigzer</span>
        </div>

        {/* Bottom: Promotional Text & Interactive Features */}
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

            {/* Feature Description Panel */}
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

      {/* ── RIGHT PANE: Auth Form Container ── */}
      <div className="relative z-10 w-full md:w-[480px] lg:w-[540px] bg-[#080A09]/90 backdrop-blur-2xl border-l border-white/5 min-h-screen flex flex-col justify-center px-8 sm:px-12 py-12 overflow-y-auto shadow-2xl">
        
        {/* Mobile Logo */}
        <div className="flex md:hidden items-center gap-3 mb-10">
          <Logo className="w-7 h-7" style={{ color: "#62D4AE" }} />
          <span className="text-lg font-bold tracking-[0.1em] uppercase text-white">Rigzer</span>
        </div>

        <div className="space-y-2 mb-8 animate-fade-up">
          <h2 className="text-2xl font-semibold text-white tracking-tight">
            {mode === 'login' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot-password' && 'Reset Access'}
          </h2>
          <p className="text-sm text-white/50">
            {mode === 'login' && 'Enter your details to sign in.'}
            {mode === 'signup' && 'Get started with email or phone number.'}
            {mode === 'forgot-password' && (resetSent ? 'Check your inbox!' : 'Enter your email to receive a reset link.')}
          </p>
        </div>

        {status && (
          <div className={`p-4 rounded-lg flex items-center gap-3 mb-6 animate-fade-up ${
            status.type === 'error'
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : 'bg-green-500/10 text-green-400 border border-green-500/20'
          }`}>
            {status.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
            <p className="text-sm font-medium">{status.message}</p>
          </div>
        )}

        <form 
          onSubmit={mode === 'forgot-password' ? handleForgotPassword : handleSubmit} 
          className="space-y-4 animate-fade-up" 
          style={{ animationDelay: '0.1s' }}
        >
          {showOTP ? (
            <div className="space-y-5">
              <div className="text-center">
                <h3 className="text-lg font-medium text-white">
                  Verify your email
                </h3>
                <p className="text-sm text-white/50 mt-2">
                  We sent a verification code to
                </p>
                <p className="text-[#62D4AE] mt-1">
                  {pendingEmail}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white/70">
                  Verification code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="123456"
                  className="w-full px-4 py-3 text-center tracking-[0.5em] bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE]/50 focus:ring-1 focus:ring-[#62D4AE]/50 text-white"
                />
              </div>

              <button
                type="button"
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.length !== 6}
                className="w-full py-3 rounded-lg bg-[#62D4AE]/10 border border-[#62D4AE]/40 text-[#62D4AE] hover:bg-[#62D4AE]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-[14px]"
              >
                {isLoading ? "Verifying..." : "Verify Email"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowOTP(false);
                  setOtp("");
                }}
                className="w-full text-sm text-white/50 hover:text-white transition-colors"
              >
                Change email
              </button>
            </div>
          ) : mode === 'forgot-password' ? (
            // ─────────────────────────────────────────────────────────────
            // FORGOT PASSWORD FORM
            // ─────────────────────────────────────────────────────────────
            resetSent ? (
              <div className="text-center space-y-6 animate-fade-up">
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-white/80 text-[14px] leading-relaxed">
                  If an account exists with <strong className="text-[#62D4AE]">{resetEmail}</strong>, you will receive a password reset link shortly.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setResetSent(false);
                    setResetEmail("");
                    setStatus(null);
                  }}
                  className="group relative w-full overflow-hidden inline-flex items-center justify-center gap-2 text-[14px] font-medium px-4 py-3 rounded-lg cursor-pointer bg-[#62D4AE]/10 border border-[#62D4AE]/40 text-[#62D4AE] transition-all duration-200 outline-none hover:bg-[#62D4AE]/20 hover:border-[#62D4AE]/70 hover:text-[#8de8ca] hover:shadow-[0_0_24px_rgba(98,212,174,0.18),inset_0_0_12px_rgba(98,212,174,0.05)] active:scale-[0.98]"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-up">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-white/70">Email address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#62D4AE] transition-colors" />
                    <input
                      type="email" required
                      value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE]/50 focus:ring-1 focus:ring-[#62D4AE]/50 text-white placeholder-white/20 transition-all text-sm"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <button
                  type="submit" disabled={isLoading}
                  className="group relative w-full overflow-hidden inline-flex items-center justify-center gap-2 text-[14px] font-medium px-4 py-3 mt-2 rounded-lg cursor-pointer bg-[#62D4AE]/10 border border-[#62D4AE]/40 text-[#62D4AE] transition-all duration-200 outline-none hover:bg-[#62D4AE]/20 hover:border-[#62D4AE]/70 hover:text-[#8de8ca] hover:shadow-[0_0_24px_rgba(98,212,174,0.18),inset_0_0_12px_rgba(98,212,174,0.05)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-br from-[#62D4AE]/10 to-transparent" />
                  <span className="relative z-10 flex items-center gap-2">
                    {isLoading ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Send Reset Link'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setStatus(null); }}
                  className="w-full mt-4 text-sm text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to sign in
                </button>
              </div>
            )
          ) : (
            // ─────────────────────────────────────────────────────────────
            // LOGIN / SIGNUP FORM
            // ─────────────────────────────────────────────────────────────
            <>
              {/* Username */}
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-white/70">Username</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#62D4AE] transition-colors" />
                    <input
                      name="username" type="text" required
                      value={formData.username} onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE]/50 focus:ring-1 focus:ring-[#62D4AE]/50 text-white placeholder-white/20 transition-all text-sm"
                      placeholder="Choose a username"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white/70">{mode === 'login' ? 'Email or username' : 'Email'}</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#62D4AE] transition-colors" />
                  <input
                    name="email" type="text" required
                    value={formData.email} onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE]/50 focus:ring-1 focus:ring-[#62D4AE]/50 text-white placeholder-white/20 transition-all text-sm"
                    placeholder={mode === 'login' ? 'your@email.com or username' : 'your@email.com'}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-white/70">Password</label>
                  {mode === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => { setMode('forgot-password'); setStatus(null); }} 
                      className="text-[12px] text-[#62D4AE] hover:text-white transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#62D4AE] transition-colors" />
                  <input
                    name="password" type={showPassword ? "text" : "password"} required
                    value={formData.password} onChange={handleInputChange}
                    className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE]/50 focus:ring-1 focus:ring-[#62D4AE]/50 text-white placeholder-white/20 transition-all text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-white/70">Confirm password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#62D4AE] transition-colors" />
                    <input
                      name="confirmPassword" type={showConfirmPassword ? "text" : "password"} required
                      value={formData.confirmPassword} onChange={handleInputChange}
                      className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE]/50 focus:ring-1 focus:ring-[#62D4AE]/50 text-white placeholder-white/20 transition-all text-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Legal Agreement */}
              {mode === 'signup' && (
                <div className="flex items-start gap-3 py-2">
                  <input
                    id="legal" type="checkbox"
                    checked={agreedToLegal} onChange={(e) => setAgreedToLegal(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-[#62D4AE] focus:ring-[#62D4AE] focus:ring-offset-0 cursor-pointer"
                  />
                  <label htmlFor="legal" className="text-xs text-white/50 leading-relaxed cursor-pointer select-none">
                    By continuing you agree to our{' '}
                    <button type="button" onClick={() => setActiveModal('privacy')} className="text-[#62D4AE] hover:underline">privacy policy</button>
                    {' '}and{' '}
                    <button type="button" onClick={() => setActiveModal('terms')} className="text-[#62D4AE] hover:underline">terms of use</button>.
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit" disabled={isLoading}
                className="group relative w-full overflow-hidden inline-flex items-center justify-center gap-2 text-[14px] font-medium px-4 py-3 mt-4 rounded-lg cursor-pointer bg-[#62D4AE]/10 border border-[#62D4AE]/40 text-[#62D4AE] transition-all duration-200 outline-none hover:bg-[#62D4AE]/20 hover:border-[#62D4AE]/70 hover:text-[#8de8ca] hover:shadow-[0_0_24px_rgba(98,212,174,0.18),inset_0_0_12px_rgba(98,212,174,0.05)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-br from-[#62D4AE]/10 to-transparent" />
                <span className="relative z-10 flex items-center gap-2">
                  {isLoading ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : (
                    <>{mode === 'login' ? 'Continue' : 'Create Account'}</>
                  )}
                </span>
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-widest">
                  <span className="px-3 bg-[#080A09] text-white/30">Or</span>
                </div>
              </div>

              <GoogleOAuthProvider clientId="970893892840-8ecshtmle4kip6ps0bl7vbkg3nogl5od.apps.googleusercontent.com">
                <button
                  onClick={handleGoogleLogin} type="button"
                  className="w-full py-2.5 px-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-sm font-medium text-white/80 flex items-center justify-center gap-3"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
              </GoogleOAuthProvider>

              <p className="text-center text-sm text-white/50 pt-6 mt-2">
                {mode === 'login' ? "New to Rigzer? " : "Already have an account? "}
                <button
                  type="button" onClick={toggleMode}
                  className="font-medium text-white hover:text-[#62D4AE] transition-colors"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </>
          )}

        </form>
      </div>
      
      <LegalModal type={activeModal} onClose={() => setActiveModal(null)} />
      
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up { animation: fadeUp 0.9s ease forwards; opacity: 0; }
      `}</style>
    </div>
  );
}