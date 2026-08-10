import React, { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useUser } from '../../context/user.js';
import { saveAccount } from '../../utils/accountRegistry.js';
import { consumeRedirect } from '../../utils/authRedirect.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

interface LoginFormProps {
  onSwitchToSignup?: () => void;
  onForgotPassword?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup, onForgotPassword }) => {
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

  const handleSignupClick = (e: React.MouseEvent) => {
    if (onSwitchToSignup) {
      e.preventDefault();
      onSwitchToSignup();
    }
  };

  const handleForgotClick = (e: React.MouseEvent) => {
    if (onForgotPassword) {
      e.preventDefault();
      onForgotPassword();
    }
  };

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
    <div className="w-full text-white font-body antialiased animate-fade-up">
      {/* Clean Header */}
      <div className="mb-6">
        <h1 className="font-headline text-2xl sm:text-3xl text-white uppercase font-bold tracking-[0.15em] text-left">
          Welcome Back
        </h1>
        <div className="mt-1 flex items-center gap-2 text-xs sm:text-sm text-gray-300">
          <span>Need an account?</span>
          {onSwitchToSignup ? (
            <button
              type="button"
              onClick={handleSignupClick}
              className="text-[#62D4AE] hover:underline font-semibold transition-colors"
            >
              Sign Up
            </button>
          ) : (
            <Link
              to="/register"
              className="text-[#62D4AE] hover:underline font-semibold transition-colors"
            >
              Sign Up
            </Link>
          )}
        </div>
      </div>

      {/* Error / Success Status Display */}
      {status && (
        <div
          className={`p-3 rounded-lg mb-4 text-xs font-medium ${
            status.type === 'error'
              ? 'bg-red-500/20 text-red-200 border border-red-500/30'
              : 'bg-green-500/20 text-green-200 border border-green-500/30'
          }`}
        >
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5 w-full">
        {/* Email or Username */}
        <div>
          <label className="block text-[12px] font-medium text-white/70 mb-1" htmlFor="email">
            Email or Username
          </label>
          <input
            id="email"
            type="text"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status) setStatus(null);
            }}
            placeholder="your@email.com or username"
            className="w-full px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white transition-all focus:border-[#62D4AE]/50 focus:outline-none placeholder-white/20 text-sm"
          />
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[12px] font-medium text-white/70" htmlFor="password">
              Password
            </label>
            {onForgotPassword ? (
              <button
                type="button"
                onClick={handleForgotClick}
                className="text-xs text-[#62D4AE] hover:underline transition-colors"
              >
                Forgot password?
              </button>
            ) : (
              <Link
                to="/forgot-password"
                className="text-xs text-[#62D4AE] hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (status) setStatus(null);
            }}
            placeholder="••••••••"
            className="w-full px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white transition-all focus:border-[#62D4AE]/50 focus:outline-none placeholder-white/20 text-sm"
          />
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 rounded-lg bg-[#62D4AE]/10 border border-[#62D4AE]/40 text-[#62D4AE] font-medium transition-all duration-200 outline-none hover:bg-[#62D4AE]/20 hover:border-[#62D4AE]/70 hover:text-[#8de8ca] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm mt-2 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            'Sign In'
          )}
        </button>

        {/* Divider & Google Sign-In */}
        <div className="flex items-center gap-3 pt-2">
          <div className="h-[1px] bg-white/10 flex-grow"></div>
          <span className="text-xs text-white/40 shrink-0">or</span>
          <div className="h-[1px] bg-white/10 flex-grow"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          aria-label="Login with Google"
          className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-xs font-medium text-white"
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
          <span>Login with Google</span>
        </button>
      </form>
    </div>
  );
};

export default LoginForm;