import React, { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useUser } from '../../context/user.js';
import { saveAccount } from '../../utils/accountRegistry.js';
import { consumeRedirect } from '../../utils/authRedirect.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const MIN_AGE = 13;

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

function validateUsernameFormat(raw: string): string | null {
  const u = raw.trim().toLowerCase();
  if (!u) return 'Username is required';
  if (u.length < 3 || u.length > 20) return 'Username must be 3-20 characters';
  if (!/^[a-z]/.test(u)) return 'Username must start with a letter';
  if (/\s/.test(u)) return 'Username cannot contain spaces';
  if (/__/.test(u)) return 'Username cannot contain consecutive underscores';
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(u)) return 'Only lowercase letters, numbers, and underscores are allowed';
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

const RegisterForm: React.FC = () => {
  const { login, user, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const addMode = searchParams.get('add') === 'true';

  const [displayName, setDisplayName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [birthdate, setBirthdate] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameMessage, setUsernameMessage] = useState<string>('');
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameCheckSeq = useRef(0);

  // Birthdate validation state
  const [birthdateError, setBirthdateError] = useState<string | null>(null);

  // OTP Verification state
  const [showOTP, setShowOTP] = useState<boolean>(false);
  const [otp, setOtp] = useState<string>('');

  // Redirect if user is already logged in
  useEffect(() => {
    if (user && !loading && !addMode) {
      const redirect = consumeRedirect();
      navigate(redirect || '/', { replace: true });
    }
  }, [user, loading, addMode, navigate]);

  // Username availability check API call
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
  }, []);

  // Debounced username checking
  useEffect(() => {
    if (!username) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    const formatError = validateUsernameFormat(username);
    if (formatError) {
      setUsernameStatus('invalid');
      setUsernameMessage(formatError);
      return;
    }

    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    usernameCheckTimer.current = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 400);

    return () => {
      if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    };
  }, [username, checkUsernameAvailability]);

  // Age validation check
  useEffect(() => {
    if (!birthdate) {
      setBirthdateError(null);
      return;
    }
    const dob = new Date(birthdate);
    if (isNaN(dob.getTime())) {
      setBirthdateError('Invalid date');
      return;
    }
    if (dob > new Date()) {
      setBirthdateError('Birthdate cannot be in the future');
      return;
    }
    const age = calculateAge(birthdate);
    if (age !== null && age < MIN_AGE) {
      setBirthdateError(`You must be at least ${MIN_AGE} years old to sign up`);
      return;
    }
    setBirthdateError(null);
  }, [birthdate]);

  // Register Form Handler
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (showOTP) {
      if (otp.length === 6) {
        handleVerifyOTP();
      }
      return;
    }

    setIsLoading(true);
    setStatus(null);

    if (!agreedToTerms) {
      setStatus({ type: 'error', message: 'You must agree to our Terms of Service and Privacy Policy to sign up.' });
      setIsLoading(false);
      return;
    }

    const formatError = validateUsernameFormat(username);
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

    if (!birthdate || birthdateError) {
      setStatus({ type: 'error', message: birthdateError || 'Complete birthdate is required.' });
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/auth/register`,
        {
          username: username.trim().toLowerCase(),
          displayName: displayName.trim(),
          email: email.trim(),
          password,
          birthdate,
        },
        { withCredentials: true }
      );

      if (response.data.requiresVerification) {
        setShowOTP(true);
        setStatus({ type: 'success', message: 'Verification code sent to your email.' });
      }
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        setStatus({
          type: 'error',
          message: err.response?.data?.error || 'Something went wrong. Please try again.',
        });
      } else {
        setStatus({ type: 'error', message: 'An unexpected error occurred.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Verification Handler
  const handleVerifyOTP = async () => {
    try {
      setIsLoading(true);
      setStatus(null);
      const response = await axios.post(
        `${BACKEND_URL}/api/auth/verify-email`,
        { email, otp },
        { withCredentials: true }
      );
      const userData = response.data.user;
      saveAccount({ userId: userData._id, username: userData.username, avatar: userData.avatar });
      login(userData);
      navigate('/');
    } catch (err: any) {
      setStatus({
        type: 'error',
        message: err.response?.data?.error || 'Invalid or expired verification code',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth Signup
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
    <div
      className="relative min-h-screen text-white font-body overflow-hidden antialiased bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/loginBackground.jpeg')" }}
    >
      <main className="relative z-10 w-full max-w-[1440px] mx-auto min-h-screen flex items-center justify-start p-4 md:p-16">
        {/* Transparent glassmorphism card container */}
        <div
          className="bg-white/10 backdrop-blur-xl text-white rounded-[2rem] border border-white/20 relative z-10 w-full max-w-[600px] flex flex-col justify-between p-8 md:p-12 min-h-[700px] shadow-2xl my-8"
          style={{
            maskImage: 'radial-gradient(circle at right center, transparent 40px, black 41px)',
            WebkitMaskImage: 'radial-gradient(circle at right center, transparent 40px, black 41px)',
          }}
        >
          <div className="flex-grow flex flex-col justify-center">
            <div className="mb-8">
              {/* Top Line: CREATE */}
              <h1 className="font-headline text-[40px] sm:text-[56px] md:text-[68px] text-white uppercase leading-[1.1] font-bold tracking-[0.35em] text-left drop-shadow-md">
                CREATE
              </h1>

              {/* Bottom Row: Options on Left, ACCOUNT shifted Left */}
              <div className="mt-2 flex items-end justify-start gap-2 sm:gap-4 md:gap-6">
                {/* Left Column: Already a member? / Sign In */}
                <div className="font-body text-sm md:text-base flex flex-col items-start justify-end gap-1 pb-1 shrink-0">
                  <span className="text-gray-200 drop-shadow">Already a member?</span>
                  <Link
                    to="/login"
                    className="text-white font-label-mono hover:underline transition-colors font-bold text-base md:text-lg drop-shadow"
                  >
                    Sign In
                  </Link>
                </div>

                {/* Right Column: ACCOUNT */}
                <div className="font-headline text-[36px] sm:text-[48px] md:text-[56px] text-white uppercase leading-[1.1] font-bold tracking-[0.25em] text-left drop-shadow-md">
                  ACCOUNT
                </div>
              </div>
            </div>

            {/* Error / Success Status Display */}
            {status && (
              <div
                className={`p-3 rounded-lg mb-4 text-sm font-medium ${
                  status.type === 'error'
                    ? 'bg-red-500/20 text-red-200 border border-red-500/30'
                    : 'bg-green-500/20 text-green-200 border border-green-500/30'
                }`}
              >
                {status.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 max-w-md w-full">
              {showOTP ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-white">Verify your email</h3>
                    <p className="text-sm text-gray-300 mt-1">We sent a verification code to</p>
                    <p className="text-[#EFFF00] font-semibold mt-1">{email}</p>
                  </div>
                  <div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit code"
                      className="w-full px-4 py-3 text-center tracking-[0.5em] text-lg rounded-lg bg-black/20 border border-white/20 text-white focus:outline-none focus:border-white placeholder-gray-400 backdrop-blur-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyOTP}
                    disabled={isLoading || otp.length !== 6}
                    className="w-full py-3 rounded-full bg-[#EFFF00] text-black font-bold hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isLoading ? 'Verifying...' : 'Verify Email'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOTP(false);
                      setOtp('');
                    }}
                    className="w-full text-xs text-gray-300 hover:text-white transition-colors text-center"
                  >
                    Change registration details
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {/* Display Name */}
                    <div>
                      <label className="sr-only" htmlFor="displayName">
                        Display Name
                      </label>
                      <input
                        id="displayName"
                        type="text"
                        required
                        maxLength={30}
                        value={displayName}
                        onChange={(e) => {
                          setDisplayName(e.target.value);
                          if (status) setStatus(null);
                        }}
                        placeholder="Display name"
                        className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/20 text-white transition-all duration-300 focus:border-white focus:bg-black/30 focus:outline-none placeholder-gray-300 backdrop-blur-sm text-sm"
                      />
                    </div>

                    {/* Username */}
                    <div>
                      <label className="sr-only" htmlFor="username">
                        Username
                      </label>
                      <input
                        id="username"
                        type="text"
                        required
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value.toLowerCase().replace(/\s/g, ''));
                          if (status) setStatus(null);
                        }}
                        placeholder="Username (lowercase, no spaces)"
                        className={`w-full px-4 py-3 rounded-lg bg-black/20 border text-white transition-all duration-300 focus:bg-black/30 focus:outline-none placeholder-gray-300 backdrop-blur-sm text-sm ${
                          usernameStatus === 'taken' || usernameStatus === 'invalid'
                            ? 'border-red-500/60'
                            : usernameStatus === 'available'
                            ? 'border-green-500/60'
                            : 'border-white/20 focus:border-white'
                        }`}
                      />
                      {usernameMessage && (
                        <p
                          className={`text-xs mt-1 ${
                            usernameStatus === 'available' ? 'text-green-300' : 'text-red-300'
                          }`}
                        >
                          {usernameMessage}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="sr-only" htmlFor="email">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (status) setStatus(null);
                        }}
                        placeholder="Your email"
                        className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/20 text-white transition-all duration-300 focus:border-white focus:bg-black/30 focus:outline-none placeholder-gray-300 backdrop-blur-sm text-sm"
                      />
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="sr-only" htmlFor="birthdate">
                        Date of Birth
                      </label>
                      <input
                        id="birthdate"
                        type="date"
                        required
                        value={birthdate}
                        onChange={(e) => {
                          setBirthdate(e.target.value);
                          if (status) setStatus(null);
                        }}
                        className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/20 text-white transition-all duration-300 focus:border-white focus:bg-black/30 focus:outline-none placeholder-gray-300 backdrop-blur-sm text-sm [color-scheme:dark]"
                      />
                      {birthdateError ? (
                        <p className="text-xs text-red-300 mt-1">{birthdateError}</p>
                      ) : (
                        <p className="text-[11px] text-gray-300 mt-1">
                          You must be at least {MIN_AGE} years old to sign up.
                        </p>
                      )}
                    </div>

                    {/* Password */}
                    <div>
                      <label className="sr-only" htmlFor="password">
                        Password
                      </label>
                      <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (status) setStatus(null);
                        }}
                        placeholder="Password"
                        className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/20 text-white transition-all duration-300 focus:border-white focus:bg-black/30 focus:outline-none placeholder-gray-300 backdrop-blur-sm text-sm"
                      />
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="sr-only" htmlFor="confirmPassword">
                        Confirm Password
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (status) setStatus(null);
                        }}
                        placeholder="Confirm password"
                        className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/20 text-white transition-all duration-300 focus:border-white focus:bg-black/30 focus:outline-none placeholder-gray-300 backdrop-blur-sm text-sm"
                      />
                    </div>
                  </div>

                  {/* Terms Checkbox */}
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      id="terms"
                      type="checkbox"
                      required
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-black/20 text-white focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-xs text-gray-200 cursor-pointer select-none">
                      I agree to the{' '}
                      <a href="#terms" className="underline hover:text-white">
                        Terms of Service
                      </a>{' '}
                      &{' '}
                      <a href="#privacy" className="underline hover:text-white">
                        Privacy Policy
                      </a>
                    </label>
                  </div>

                  {/* Sign Up Button */}
                  <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="w-full h-[64px] rounded-full relative overflow-hidden flex items-center justify-between px-8 border-2 border-gray-900 bg-cover bg-center bg-fixed transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] shadow-inner mt-2 disabled:opacity-50 disabled:pointer-events-none"
                    style={{ backgroundImage: "url('/loginBackground.jpeg')" }}
                  >
                    <span className="font-bold text-xl tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      {isLoading ? 'Creating...' : 'Sign Up'}
                    </span>
                    <div className="w-10 h-10 bg-[#EFFF00] rounded-full flex items-center justify-center shadow-lg shrink-0">
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-black font-bold" style={{ fontSize: '20px' }}>
                          north_east
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Divider & Google Register Button */}
                  <div className="flex items-center gap-4 pt-1">
                    <span className="text-xs font-label-mono text-gray-300 shrink-0">or</span>
                    <div className="h-[1px] bg-white/20 flex-grow"></div>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      aria-label="Sign up with Google"
                      className="flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 hover:border-white/40 transition-all duration-300 text-sm font-medium text-white shrink-0 backdrop-blur-sm"
                    >
                      <span>Sign up with Google</span>
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
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
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegisterForm;