import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2, Plus, ArrowLeft, Loader2, XCircle, Cake } from 'lucide-react';
import { GoogleOAuthProvider } from "@react-oauth/google";
import { saveAccount } from "../utils/accountRegistry.js";
import { useNavigate, useLocation } from "react-router-dom";
import axios from 'axios';
import { useUser } from "../context/user.js";
import LegalModal from './LegalModal';
import Logo from "../assets/Icon.svg?react";

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'google-setup';
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const FEATURES = [
  { id: 1, title: "Embed 3D Models", desc: "Seamlessly integrate interactive 3D creations directly in your feed." },
  { id: 2, title: "Cloud-Powered Games", desc: "Play, share, and experience high-performance gaming instantly." },
  { id: 3, title: "Code-In Creator Pockets", desc: "Build, customize, and monetize your space with direct code access." }
];

const MIN_AGE = 13;

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);
const MONTHS = [
  { val: 1, name: "January" }, { val: 2, name: "February" }, { val: 3, name: "March" },
  { val: 4, name: "April" }, { val: 5, name: "May" }, { val: 6, name: "June" },
  { val: 7, name: "July" }, { val: 8, name: "August" }, { val: 9, name: "September" },
  { val: 10, name: "October" }, { val: 11, name: "November" }, { val: 12, name: "December" }
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function validateUsernameFormat(raw: string): string | null {
  const u = raw.trim().toLowerCase();
  if (!u) return "Username is required";
  if (u.length < 3 || u.length > 20) return "Username must be 3-20 characters";
  if (!/^[a-z]/.test(u)) return "Username must start with a letter";
  if (/\s/.test(u)) return "Username cannot contain spaces";
  if (/__/.test(u)) return "Username cannot contain consecutive underscores";
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(u)) return "Only lowercase letters, numbers, and underscores are allowed";
  return null;
}

function calculateAge(birthdateStr: string): number | null {
  if (!birthdateStr) return null;
  const dob = new Date(birthdateStr);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}


// Custom Select Component for exact control over height and direction
const CustomSelect = ({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  error 
}: { 
  value: string | number; 
  onChange: (val: string) => void; 
  options: { val: string | number; name: string | number }[]; 
  placeholder: string;
  error?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.val.toString() === value.toString());

  return (
    <div className="relative w-1/3" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2.5 flex items-center justify-between bg-white/5 border rounded-lg text-sm focus:outline-none transition-colors ${
          error 
            ? 'border-red-500/40 text-white' 
            : isOpen 
              ? 'border-[#62D4AE]/50 text-white' 
              : 'border-white/10 text-white'
        } ${!selectedOption ? 'text-white/50' : ''}`}
      >
        <span className="truncate">{selectedOption ? selectedOption.name : placeholder}</span>
        <svg className={`w-4 h-4 transition-transform text-white/40 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#0f1311] border border-white/10 rounded-lg shadow-xl overflow-hidden">
          <ul className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
            {options.map((opt) => (
              <li
                key={opt.val}
                onClick={() => {
                  onChange(opt.val.toString());
                  setIsOpen(false);
                }}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                  value.toString() === opt.val.toString() 
                    ? 'bg-[#62D4AE]/20 text-[#62D4AE]' 
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {opt.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

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

  const [googleTempToken, setGoogleTempToken] = useState("");

  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthdate: ''
  });

  // Separate dropdown states for DOB
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameMessage, setUsernameMessage] = useState<string>('');
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameCheckSeq = useRef(0);

  const [birthdateError, setBirthdateError] = useState<string | null>(null);
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Combine dropdowns into standard YYYY-MM-DD
  useEffect(() => {
    if (birthMonth && birthDay && birthYear) {
      const formatted = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
      setFormData(prev => ({ ...prev, birthdate: formatted }));
    } else {
      setFormData(prev => ({ ...prev, birthdate: '' }));
    }
  }, [birthMonth, birthDay, birthYear]);

  // Handle returning from Google OAuth for a NEW user
  useEffect(() => {
    const isGoogleSetup = searchParams.get("googleSetup") === "true";
    const token = searchParams.get("tempToken");
    const name = searchParams.get("name");

    if (isGoogleSetup && token) {
      setMode("google-setup");
      setGoogleTempToken(token);
      if (name) {
        setFormData(prev => ({ ...prev, displayName: decodeURIComponent(name) }));
      }
      
      // Clean up URL to hide token
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Background Canvas Animation (kept original)
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
      navigate("/");
    }
  }, [user, loading, addMode, navigate]);

  const checkUsernameAvailability = useCallback((value: string) => {
    const formatError = validateUsernameFormat(value);
    if (formatError) {
      setUsernameStatus('invalid');
      setUsernameMessage(formatError);
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage('');
    const seq = ++usernameCheckSeq.current;

    axios
      .get(`${BACKEND_URL}/api/auth/check-username`, { params: { username: value.trim().toLowerCase() } })
      .then((res) => {
        if (seq !== usernameCheckSeq.current) return;
        if (res.data.available) {
          setUsernameStatus('available');
          setUsernameMessage('Username is available');
        } else {
          setUsernameStatus(res.data.error?.includes('taken') ? 'taken' : 'invalid');
          setUsernameMessage(res.data.error || 'Username is not available');
        }
      })
      .catch(() => {
        if (seq !== usernameCheckSeq.current) return;
        setUsernameStatus('idle');
        setUsernameMessage('');
      });
  }, [BACKEND_URL]);

  useEffect(() => {
    if (mode !== 'signup' && mode !== 'google-setup') return;

    if (!formData.username) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    const formatError = validateUsernameFormat(formData.username);
    if (formatError) {
      setUsernameStatus('invalid');
      setUsernameMessage(formatError);
      return;
    }

    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    usernameCheckTimer.current = setTimeout(() => {
      checkUsernameAvailability(formData.username);
    }, 400);

    return () => {
      if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    };
  }, [formData.username, mode]);

  useEffect(() => {
    if (!formData.birthdate) {
      setBirthdateError(null);
      return;
    }
    const dob = new Date(formData.birthdate);
    if (isNaN(dob.getTime())) {
      setBirthdateError("Invalid date");
      return;
    }
    if (dob > new Date()) {
      setBirthdateError("Birthdate cannot be in the future");
      return;
    }
    const age = calculateAge(formData.birthdate);
    if (age !== null && age < MIN_AGE) {
      setBirthdateError(`You must be at least ${MIN_AGE} years old to sign up`);
      return;
    }
    setBirthdateError(null);
  }, [formData.birthdate]);

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
      if ((mode === 'signup' || mode === 'google-setup') && !agreedToLegal) {
        setStatus({ type: 'error', message: "You must agree to our Terms of Service and Privacy Policy to sign up." });
        setIsLoading(false);
        return;
      }

      if (mode === 'signup' || mode === 'google-setup') {
        const formatError = validateUsernameFormat(formData.username);
        if (formatError) {
          setStatus({ type: 'error', message: formatError });
          setIsLoading(false);
          return;
        }
        if (usernameStatus === 'taken') {
          setStatus({ type: 'error', message: 'That username is already taken.' });
          setIsLoading(false);
          return;
        }
        if (!formData.displayName.trim()) {
          setStatus({ type: 'error', message: 'Display name is required.' });
          setIsLoading(false);
          return;
        }
        if (!formData.birthdate || birthdateError) {
          setStatus({ type: 'error', message: birthdateError || 'Complete birthdate is required.' });
          setIsLoading(false);
          return;
        }
      }

      if (mode === 'signup' && formData.password !== formData.confirmPassword) {
        setStatus({ type: 'error', message: "Passwords do not match." });
        setIsLoading(false);
        return;
      }

      // ── Google Account Finalization ──
      if (mode === 'google-setup') {
        const response = await axios.post(`${BACKEND_URL}/api/auth/google-complete`, {
          username: formData.username.trim().toLowerCase(),
          displayName: formData.displayName.trim(),
          birthdate: formData.birthdate,
          tempToken: googleTempToken
        }, { withCredentials: true });

        if (response.status === 200) {
          const user = response.data.user;
          saveAccount({ userId: user._id, username: user.username, avatar: user.avatar });
          login(user);
          navigate("/");
        }
        return;
      }

      // ── Standard Login ──
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
      } 
      // ── Standard Signup ──
      else if (mode === 'signup') {
        const response = await axios.post(`${BACKEND_URL}/api/auth/register`, {
          username: formData.username.trim().toLowerCase(),
          displayName: formData.displayName.trim(),
          email: formData.email,
          password: formData.password,
          birthdate: formData.birthdate
        }, { withCredentials: true });
        
        if (response.data.requiresVerification) {
          setPendingEmail(formData.email);
          setShowOTP(true);
          setStatus({ type: "success", message: "Verification code sent to your email." });
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
      const response = await axios.post(`${BACKEND_URL}/api/auth/verify-email`, { email: pendingEmail, otp }, { withCredentials: true });
      const user = response.data.user;
      saveAccount({ userId: user._id, username: user.username, avatar: user.avatar });
      login(user);
      navigate("/");
    } catch (err: any) {
      setStatus({ type: "error", message: err.response?.data?.error || "Invalid or expired verification code" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/google`;
  };

  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'signup' : 'login');
    setFormData({ username: '', displayName: '', email: '', password: '', confirmPassword: '', birthdate: '' });
    setBirthMonth(""); setBirthDay(""); setBirthYear("");
    setStatus(null);
    setAgreedToLegal(false);
    setActiveModal(null);
    setUsernameStatus('idle');
    setUsernameMessage('');
    setBirthdateError(null);
  };

  const isSubmitDisabled =
    isLoading ||
    ((mode === 'signup' || mode === 'google-setup') && (
      usernameStatus === 'checking' ||
      usernameStatus === 'taken' ||
      usernameStatus === 'invalid' ||
      !!birthdateError
    ));

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

      {/* ── RIGHT PANE ── */}
      <div className="relative z-10 w-full md:w-[480px] lg:w-[540px] bg-[#080A09]/90 backdrop-blur-2xl border-l border-white/5 min-h-screen flex flex-col justify-center px-8 sm:px-12 py-12 overflow-y-auto shadow-2xl">
        <div className="flex md:hidden items-center gap-3 mb-10">
          <Logo className="w-7 h-7" style={{ color: "#62D4AE" }} />
          <span className="text-lg font-bold tracking-[0.1em] uppercase text-white">Rigzer</span>
        </div>

        <div className="space-y-2 mb-8 animate-fade-up">
          <h2 className="text-2xl font-semibold text-white tracking-tight">
            {mode === 'login' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'google-setup' && 'Complete your profile'}
            {mode === 'forgot-password' && 'Reset Access'}
          </h2>
          <p className="text-sm text-white/50">
            {mode === 'login' && 'Enter your details to sign in.'}
            {mode === 'signup' && 'Get started with email or phone number.'}
            {mode === 'google-setup' && 'Just a few more details to finish setting up your account.'}
            {mode === 'forgot-password' && (resetSent ? 'Check your inbox!' : 'Enter your email to receive a reset link.')}
          </p>
        </div>

        {status && (
          <div className={`p-4 rounded-lg flex items-center gap-3 mb-6 animate-fade-up ${
            status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
          }`}>
            {status.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
            <p className="text-sm font-medium">{status.message}</p>
          </div>
        )}

        <form onSubmit={mode === 'forgot-password' ? handleForgotPassword : handleSubmit} className="space-y-4 animate-fade-up " style={{ animationDelay: '0.1s' }}>
          {showOTP ? (
            <div className="space-y-5">
              <div className="text-center">
                <h3 className="text-lg font-medium text-white">Verify your email</h3>
                <p className="text-sm text-white/50 mt-2">We sent a verification code to</p>
                <p className="text-[#62D4AE] mt-1">{pendingEmail}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white/70">Verification code</label>
                <input
                  type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456" className="w-full px-4 py-3 text-center tracking-[0.5em] bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE]/50 focus:ring-1 focus:ring-[#62D4AE]/50 text-white"
                />
              </div>
              <button
                type="button" onClick={handleVerifyOTP} disabled={isLoading || otp.length !== 6}
                className="w-full py-3 rounded-lg bg-[#62D4AE]/10 border border-[#62D4AE]/40 text-[#62D4AE] hover:bg-[#62D4AE]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-[14px]"
              >
                {isLoading ? "Verifying..." : "Verify Email"}
              </button>
              <button type="button" onClick={() => { setShowOTP(false); setOtp(""); }} className="w-full text-sm text-white/50 hover:text-white transition-colors">
                Change email
              </button>
            </div>
          ) : mode === 'forgot-password' ? (
            resetSent ? (
              <div className="text-center space-y-6 animate-fade-up">
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-white/80 text-[14px] leading-relaxed">
                  If an account exists with <strong className="text-[#62D4AE]">{resetEmail}</strong>, you will receive a password reset link shortly.
                </div>
                <button
                  type="button" onClick={() => { setMode('login'); setResetSent(false); setResetEmail(""); setStatus(null); }}
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
                      type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE]/50 focus:ring-1 focus:ring-[#62D4AE]/50 text-white placeholder-white/20 transition-all text-sm"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={isLoading}
                  className="group relative w-full overflow-hidden inline-flex items-center justify-center gap-2 text-[14px] font-medium px-4 py-3 mt-2 rounded-lg cursor-pointer bg-[#62D4AE]/10 border border-[#62D4AE]/40 text-[#62D4AE] transition-all duration-200 outline-none hover:bg-[#62D4AE]/20 hover:border-[#62D4AE]/70 hover:text-[#8de8ca] hover:shadow-[0_0_24px_rgba(98,212,174,0.18),inset_0_0_12px_rgba(98,212,174,0.05)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isLoading ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Send Reset Link'}
                  </span>
                </button>
                <button
                  type="button" onClick={() => { setMode('login'); setStatus(null); }}
                  className="w-full mt-4 text-sm text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to sign in
                </button>
              </div>
            )
          ) : (
            <>
              {/* Display Name */}
              {(mode === 'signup' || mode === 'google-setup') && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-white/70">Display name</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#62D4AE] transition-colors" />
                    <input
                      name="displayName" type="text" required maxLength={30}
                      value={formData.displayName} onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE]/50 focus:ring-1 focus:ring-[#62D4AE]/50 text-white placeholder-white/20 transition-all text-sm"
                      placeholder="How should we display your name?"
                    />
                  </div>
                </div>
              )}

              {/* Username */}
              {(mode === 'signup' || mode === 'google-setup') && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-white/70">Username</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#62D4AE] transition-colors" />
                    <input
                      name="username" type="text" required autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      value={formData.username}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\s/g, '').toLowerCase();
                        setFormData(prev => ({ ...prev, username: cleaned }));
                        if (status) setStatus(null);
                      }}
                      className={`w-full pl-10 pr-9 py-2.5 bg-white/5 border rounded-lg focus:outline-none focus:ring-1 text-white placeholder-white/20 transition-all text-sm ${
                        usernameStatus === 'taken' || usernameStatus === 'invalid'
                          ? 'border-red-500/40 focus:border-red-500/60 focus:ring-red-500/40'
                          : usernameStatus === 'available'
                          ? 'border-[#62D4AE]/40 focus:border-[#62D4AE]/60 focus:ring-[#62D4AE]/40'
                          : 'border-white/10 focus:border-[#62D4AE]/50 focus:ring-[#62D4AE]/50'
                      }`}
                      placeholder="lowercase, no spaces"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      {usernameStatus === 'checking' && <Loader2 className="h-4 w-4 text-white/40 animate-spin" />}
                      {usernameStatus === 'available' && <CheckCircle2 className="h-4 w-4 text-[#62D4AE]" />}
                      {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <XCircle className="h-4 w-4 text-red-400" />}
                    </div>
                  </div>
                  {usernameMessage && (
                    <p className={`text-[12px] ${usernameStatus === 'available' ? 'text-[#62D4AE]' : 'text-red-400'}`}>
                      {usernameMessage}
                    </p>
                  )}
                </div>
              )}

              {/* Email (Hidden in Google Setup since we pull it from token) */}
              {mode !== 'google-setup' && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-white/70">{mode === 'login' ? 'Email or username' : 'Email'}</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#62D4AE] transition-colors" />
                    <input
                      name="email" type="text" required value={formData.email} onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE]/50 focus:ring-1 focus:ring-[#62D4AE]/50 text-white placeholder-white/20 transition-all text-sm"
                      placeholder={mode === 'login' ? 'your@email.com or username' : 'your@email.com'}
                    />
                  </div>
                </div>
              )}

              {/* Birthdate (3 Custom Dropdowns) */}
              {(mode === 'signup' || mode === 'google-setup') && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-white/70">Date of birth</label>
                  <div className="flex gap-2 w-full">
                    
                    <CustomSelect
                      value={birthMonth}
                      onChange={setBirthMonth}
                      placeholder="Month"
                      options={MONTHS}
                      error={!!birthdateError}
                    />

                    <CustomSelect
                      value={birthDay}
                      onChange={setBirthDay}
                      placeholder="Day"
                      options={DAYS.map(d => ({ val: d, name: d }))}
                      error={!!birthdateError}
                    />

                    <CustomSelect
                      value={birthYear}
                      onChange={setBirthYear}
                      placeholder="Year"
                      options={YEARS.map(y => ({ val: y, name: y }))}
                      error={!!birthdateError}
                    />

                  </div>
                  {birthdateError ? (
                    <p className="text-[12px] text-red-400">{birthdateError}</p>
                  ) : (
                    <p className="text-[12px] text-white/30">You must be at least {MIN_AGE} years old to use Rigzer.</p>
                  )}
                </div>
              )}

              {/* Passwords - hidden for Google Setup */}
              {mode !== 'google-setup' && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-medium text-white/70">Password</label>
                      {mode === 'login' && (
                        <button type="button" onClick={() => { setMode('forgot-password'); setStatus(null); }} className="text-[12px] text-[#62D4AE] hover:text-white transition-colors">
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
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

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
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Legal Agreement */}
              {(mode === 'signup' || mode === 'google-setup') && (
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
                type="submit" disabled={isSubmitDisabled}
                className="group relative w-full overflow-hidden inline-flex items-center justify-center gap-2 text-[14px] font-medium px-4 py-3 mt-4 rounded-lg cursor-pointer bg-[#62D4AE]/10 border border-[#62D4AE]/40 text-[#62D4AE] transition-all duration-200 outline-none hover:bg-[#62D4AE]/20 hover:border-[#62D4AE]/70 hover:text-[#8de8ca] hover:shadow-[0_0_24px_rgba(98,212,174,0.18),inset_0_0_12px_rgba(98,212,174,0.05)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isLoading ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : (
                    <>{mode === 'login' ? 'Continue' : 'Create Account'}</>
                  )}
                </span>
              </button>

              {/* Hide alternative logins in google-setup mode */}
              {mode !== 'google-setup' && (
                <>
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
                </>
              )}

              {/* Lower text redirect */}
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
      .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fadeUp 0.9s ease forwards; opacity: 0; }
        select { color-scheme: dark; } /* Enforce dark mode dropdowns heavily */
      `}</style>
    </div>
  );
}