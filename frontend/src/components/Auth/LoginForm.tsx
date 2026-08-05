import React, { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useUser } from '../../context/user.js';
import { saveAccount } from '../../utils/accountRegistry.js';
import { consumeRedirect } from '../../utils/authRedirect.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const LoginForm: React.FC = () => {
  const { login, user, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const addMode = searchParams.get('add') === 'true';

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Redirect logic if user is already logged in
  useEffect(() => {
    if (user && !loading && !addMode) {
      const redirect = consumeRedirect();
      navigate(redirect || '/', { replace: true });
    }
  }, [user, loading, addMode, navigate]);

  // Login submission logic
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/auth/login`,
        { emailOrUsername: email, password },
        { withCredentials: true }
      );

      if (response.status === 200) {
        const userData = response.data.user;
        saveAccount({ userId: userData._id, username: userData.username, avatar: userData.avatar });
        login(userData);
        navigate('/');
      }
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        if (err.response?.data?.requiresVerification) {
          navigate(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
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

  // Google OAuth Login
  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/google`;
  };

  return (
    <div
      className="relative min-h-screen text-white font-body overflow-hidden antialiased bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/loginBackground.jpeg')" }}
    >
      <main className="relative z-10 w-full max-w-[1440px] mx-auto min-h-screen flex items-center justify-start p-4 md:p-16">
        {/* Transparent glassmorphism card container */}
        <div
          className="bg-white/10 backdrop-blur-xl text-white rounded-[2rem] border border-white/20 relative z-10 w-full max-w-[600px] flex flex-col justify-between p-8 md:p-16 min-h-[700px] shadow-2xl"
          style={{
            maskImage: 'radial-gradient(circle at right center, transparent 40px, black 41px)',
            WebkitMaskImage: 'radial-gradient(circle at right center, transparent 40px, black 41px)',
          }}
        >
          <div className="mt-12 md:mt-0 flex-grow flex flex-col justify-center">
            <div className="mb-8">
              {/* Top Line: WELCOME */}
              <h1 className="font-headline text-[40px] sm:text-[56px] md:text-[68px] text-white uppercase leading-[1.1] font-bold tracking-[0.35em] text-left drop-shadow-md">
                WELCOME
              </h1>

              {/* Bottom Row: Options on Left, BACK shifted Left */}
              <div className="mt-4 flex items-end justify-start gap-8 sm:gap-10 md:gap-12">
                {/* Left Column: Need an account? / Sign Up */}
                <div className="font-body text-sm md:text-base flex flex-col items-start justify-end gap-1 pb-1 shrink-0">
                  <span className="text-gray-200 drop-shadow">Need an account?</span>
                  <Link
                    to="/register"
                    className="text-white font-label-mono hover:underline transition-colors font-bold text-base md:text-lg drop-shadow"
                  >
                    Sign Up
                  </Link>
                </div>

                {/* Right Column: BACK */}
                <div className="font-headline text-[40px] sm:text-[56px] md:text-[68px] text-white uppercase leading-[1.1] font-bold tracking-[0.35em] text-left drop-shadow-md">
                  BACK
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

            <form onSubmit={handleSubmit} className="space-y-6 max-w-md w-full">
              <div className="space-y-4">
                <div>
                  <label className="sr-only" htmlFor="email">
                    Email or Username
                  </label>
                  <input
                    id="email"
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email or username"
                    className="w-full px-4 py-4 rounded-lg bg-black/20 border border-white/20 text-white transition-all duration-300 focus:border-white focus:bg-black/30 focus:outline-none placeholder-gray-300 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <label className="sr-only" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full px-4 py-4 rounded-lg bg-black/20 border border-white/20 text-white transition-all duration-300 focus:border-white focus:bg-black/30 focus:outline-none placeholder-gray-300 backdrop-blur-sm"
                  />
                  <div className="flex justify-end items-center text-sm mt-2">
                    <Link
                      to="/forgot-password"
                      className="text-gray-200 hover:text-white transition-colors text-xs md:text-sm drop-shadow"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>
              </div>

              {/* Sign In button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[72px] rounded-full relative overflow-hidden flex items-center justify-between px-8 border-2 border-gray-900 bg-cover bg-center bg-fixed transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] shadow-inner disabled:opacity-50 disabled:pointer-events-none"
                style={{ backgroundImage: "url('/loginBackground.jpeg')" }}
              >
                <span className="font-bold text-xl tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </span>
                <div className="w-12 h-12 bg-[#EFFF00] rounded-full flex items-center justify-center shadow-lg shrink-0">
                  {isLoading ? (
                    <div className="h-5 w-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-black font-bold" style={{ fontSize: '24px' }}>
                      north_east
                    </span>
                  )}
                </div>
              </button>

              {/* Divider & Google Login Button */}
              <div className="flex items-center gap-4 pt-2">
                <span className="text-xs font-label-mono text-gray-300 shrink-0">or</span>
                <div className="h-[1px] bg-white/20 flex-grow"></div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  aria-label="Login with Google"
                  className="flex items-center gap-3 px-5 py-3 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 hover:border-white/40 transition-all duration-300 text-sm font-medium text-white shrink-0 backdrop-blur-sm"
                >
                  <span>Login with Google</span>
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
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginForm;