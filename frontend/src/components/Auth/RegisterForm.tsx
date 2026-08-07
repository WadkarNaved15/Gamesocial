import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { GoogleOAuthProvider } from "@react-oauth/google";
import axios from 'axios';
import { Link, useNavigate } from "react-router-dom";
import { saveAccount } from "../../utils/accountRegistry.js";
import { useUser } from "../../context/user.js";
import { CustomSelect } from './CustomSelect';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
type RegisterVariant = 'signup' | 'google-setup';

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

interface RegisterFormProps {
  variant: RegisterVariant;
  onSwitchToLogin?: () => void;
  onOpenLegalModal: (type: 'terms' | 'privacy') => void;
  /** Only used when variant === 'google-setup' */
  googleTempToken?: string;
  initialDisplayName?: string;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  variant,
  onSwitchToLogin,
  onOpenLegalModal,
  googleTempToken,
  initialDisplayName
}) => {
  const { login } = useUser();
  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToLegal, setAgreedToLegal] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    displayName: initialDisplayName || '',
    email: '',
    password: '',
    confirmPassword: '',
    birthdate: ''
  });

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

  // Combine dropdowns into standard YYYY-MM-DD
  useEffect(() => {
    if (birthMonth && birthDay && birthYear) {
      const formatted = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
      setFormData(prev => ({ ...prev, birthdate: formatted }));
    } else {
      setFormData(prev => ({ ...prev, birthdate: '' }));
    }
  }, [birthMonth, birthDay, birthYear]);

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
  }, [formData.username, checkUsernameAvailability]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (showOTP) {
      if (otp.length === 6) {
        handleVerifyOTP();
      }
      return;
    }

    setIsLoading(true);
    setStatus(null);
    try {
      if (!agreedToLegal) {
        setStatus({ type: 'error', message: "You must agree to our Terms of Service and Privacy Policy to sign up." });
        setIsLoading(false);
        return;
      }

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

      if (variant === 'signup' && formData.password !== formData.confirmPassword) {
        setStatus({ type: 'error', message: "Passwords do not match." });
        setIsLoading(false);
        return;
      }

      // ── Google Account Finalization ──
      if (variant === 'google-setup') {
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

      // ── Standard Signup ──
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

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/google`;
  };

  const isSubmitDisabled =
    isLoading ||
    usernameStatus === 'checking' ||
    usernameStatus === 'taken' ||
    usernameStatus === 'invalid' ||
    !!birthdateError;

  return (
    <div className="w-full max-h-full overflow-y-auto px-1 py-2 my-auto scrollbar-thin">
      {/* Clean Header */}
      <div className="mb-6 animate-fade-up">
        <h1 className="font-headline text-2xl sm:text-3xl text-white uppercase font-bold tracking-[0.15em] text-left">
          Create Account
        </h1>
        <div className="mt-1 flex items-center gap-2 text-xs sm:text-sm text-gray-300">
          <span>Already a member?</span>
          <button type="button"
            onClick={onSwitchToLogin}
            className="text-[#62D4AE] hover:underline font-semibold transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-lg flex items-center gap-3 mb-6 animate-fade-up ${status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
          }`}>
          {status.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
          <p className="text-sm font-medium">{status.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
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
        ) : (
          <>
            {/* Display Name */}
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

            {/* Username */}
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
                  className={`w-full pl-10 pr-9 py-2.5 bg-white/5 border rounded-lg focus:outline-none focus:ring-1 text-white placeholder-white/20 transition-all text-sm ${usernameStatus === 'taken' || usernameStatus === 'invalid'
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

            {/* Email (hidden in google-setup, pulled from token server-side) */}
            {variant === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-white/70">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#62D4AE] transition-colors" />
                  <input
                    name="email" type="text" required value={formData.email} onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE]/50 focus:ring-1 focus:ring-[#62D4AE]/50 text-white placeholder-white/20 transition-all text-sm"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            )}

            {/* Birthdate (3 Custom Dropdowns) */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-white/70">Date of birth</label>
              <div className="flex gap-2 w-full">
                <CustomSelect value={birthMonth} onChange={setBirthMonth} placeholder="Month" options={MONTHS} error={!!birthdateError} />
                <CustomSelect value={birthDay} onChange={setBirthDay} placeholder="Day" options={DAYS.map(d => ({ val: d, name: d }))} error={!!birthdateError} />
                <CustomSelect value={birthYear} onChange={setBirthYear} placeholder="Year" options={YEARS.map(y => ({ val: y, name: y }))} error={!!birthdateError} />
              </div>
              {birthdateError ? (
                <p className="text-[12px] text-red-400">{birthdateError}</p>
              ) : (
                <p className="text-[12px] text-white/30">You must be at least {MIN_AGE} years old to use Rigzer.</p>
              )}
            </div>

            {/* Passwords - hidden for Google Setup */}
            {variant === 'signup' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-white/70">Password</label>
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
              </>
            )}

            {/* Legal Agreement */}
            <div className="flex items-start gap-3 py-2">
              <input
                id="legal" type="checkbox"
                checked={agreedToLegal} onChange={(e) => setAgreedToLegal(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-[#62D4AE] focus:ring-[#62D4AE] focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="legal" className="text-xs text-white/50 leading-relaxed cursor-pointer select-none">
                By continuing you agree to our{' '}
                <button type="button" onClick={() => onOpenLegalModal('privacy')} className="text-[#62D4AE] hover:underline">privacy policy</button>
                {' '}and{' '}
                <button type="button" onClick={() => onOpenLegalModal('terms')} className="text-[#62D4AE] hover:underline">terms of use</button>.
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit" disabled={isSubmitDisabled}
              className="group relative w-full overflow-hidden inline-flex items-center justify-center gap-2 text-[14px] font-medium px-4 py-3 mt-4 rounded-lg cursor-pointer bg-[#62D4AE]/10 border border-[#62D4AE]/40 text-[#62D4AE] transition-all duration-200 outline-none hover:bg-[#62D4AE]/20 hover:border-[#62D4AE]/70 hover:text-[#8de8ca] hover:shadow-[0_0_24px_rgba(98,212,174,0.18),inset_0_0_12px_rgba(98,212,174,0.05)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isLoading ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Create Account'}
              </span>
            </button>

            {/* Hide alternative logins in google-setup mode */}
            {variant === 'signup' && (
              <>
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-[1px] bg-white/10 flex-grow"></div>
                  <span className="text-xs text-white/40 shrink-0">or</span>
                  <div className="h-[1px] bg-white/10 flex-grow"></div>
                </div>

                <GoogleOAuthProvider clientId="970893892840-8ecshtmle4kip6ps0bl7vbkg3nogl5od.apps.googleusercontent.com">
                  <button
                    onClick={handleGoogleLogin} type="button"
                    className="w-full py-2.5 px-4 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-sm font-medium text-white/80 flex items-center justify-center gap-3"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </button>
                </GoogleOAuthProvider>
              </>
            )}
          </>
        )}
      </form>
    </div>
  );
};

export default RegisterForm;