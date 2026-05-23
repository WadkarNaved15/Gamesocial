import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GoogleOAuthProvider } from "@react-oauth/google";
import { saveAccount } from "../utils/accountRegistry.js";
import { useNavigate, useLocation } from "react-router-dom";
import axios from 'axios';
import { useUser } from "../context/user.js";

type AuthMode = 'login' | 'signup';

function Auth() {
  const { login, user, loading } = useUser();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const [mode, setMode] = useState<AuthMode>('login');
  const [status, setStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const addMode = searchParams.get("add") === "true";

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (status) setStatus(null);
  };

  useEffect(() => {
    if (user && !loading && !addMode) {
      navigate("/");
    }
  }, [user, loading, addMode, navigate]);

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

      if (mode === 'login') {
        const response = await axios.post(
          `${BACKEND_URL}/api/auth/login`,
          {
            emailOrUsername: formData.email,
            password: formData.password
          },
          {
            withCredentials: true
          }
        );

        console.log(response.data);
        if (response.status === 200) {
          const user = response.data.user;

          saveAccount({
            userId: user._id,
            username: user.username,
            avatar: user.avatar
          });

          login(user);
          navigate("/");
        }

      } else {
        const response = await axios.post(`${BACKEND_URL}/api/auth/register`, {
          username: formData.username,
          email: formData.email,
          password: formData.password
        },
          { withCredentials: true }
        );
        if (response.data.requiresVerification) {
          navigate(`/verify-email?email=${formData.email}`);
          return;
        }
      }

    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        if (err.response?.data?.requiresVerification) {
          navigate(`/verify-email?email=${formData.email}`);
          return;
        }

        setStatus({
          type: 'error',
          message: err.response?.data?.error || "Something went wrong. Please try again."
        });
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

  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'signup' : 'login');
    setFormData({ username: '', email: '', password: '', confirmPassword: '' });
    setStatus(null);
  };

  const gradient = isDark
    ? 'linear-gradient(to bottom right, #3D7A6E, #000000)'
    : 'linear-gradient(to bottom right, #9ca3af, #374151)';

  const bodyBg = isDark ? '#000000' : '#f3f4f6';
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)';

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#f0f0f0_1px,transparent_1px),linear-gradient(#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(90deg,#1a1a1a_1px,transparent_1px),linear-gradient(#1a1a1a_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 pointer-events-none" />

      {/* Minimal accent gradients */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-gray-200/20 to-transparent dark:from-teal-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-gray-200/20 to-transparent dark:from-teal-900/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div style={{ background: bodyBg, border: `1px solid ${borderColor}` }} className="rounded-2xl shadow-lg backdrop-blur-sm p-8 space-y-6">

          {/* Header */}
          <div style={{ background: gradient }} className="text-white space-y-2 -m-8 mb-6 p-8 pb-6">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-sm text-white/70">
              {mode === 'login'
                ? 'Sign in to your Rigzer account'
                : 'Join Rigzer to get started'
              }
            </p>
          </div>

          {/* Status Message */}
          {status && (
            <div
              className={`p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                status.type === 'error'
                  ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30'
                  : 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30'
              }`}
            >
              {status.type === 'error'
                ? <AlertCircle className="h-5 w-5 shrink-0" />
                : <CheckCircle2 className="h-5 w-5 shrink-0" />
              }
              <p className="text-sm font-medium">{status.message}</p>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username - Signup Only */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-white/80">
                  Username
                </label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40 transition-colors group-focus-within:text-gray-600 dark:group-focus-within:text-white/60" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="block w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-gray-400 dark:focus:ring-teal-400 focus:border-gray-400 dark:focus:border-teal-400 transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/40"
                    placeholder="Choose a username"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-white/80">
                Email or username
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40 transition-colors group-focus-within:text-gray-600 dark:group-focus-within:text-white/60" />
                <input
                  id="email"
                  name="email"
                  type="text"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-gray-400 dark:focus:ring-teal-400 focus:border-gray-400 dark:focus:border-teal-400 transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/40"
                  placeholder={mode === 'login' ? 'your@email.com or username' : 'your@email.com'}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-white/80">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40 transition-colors group-focus-within:text-gray-600 dark:group-focus-within:text-white/60" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-9 pr-10 py-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-gray-400 dark:focus:ring-teal-400 focus:border-gray-400 dark:focus:border-teal-400 transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/40"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password - Signup Only */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-white/80">
                  Confirm password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40 transition-colors group-focus-within:text-gray-600 dark:group-focus-within:text-white/60" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="block w-full pl-9 pr-10 py-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-1 focus:ring-gray-400 dark:focus:ring-teal-400 focus:border-gray-400 dark:focus:border-teal-400 transition-all bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/40"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Remember me & Forgot password - Login Only */}
            {mode === 'login' && (
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 border border-gray-300 dark:border-white/10 rounded bg-white dark:bg-white/5 cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 dark:text-white/60">
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 mt-2 rounded-lg bg-gray-900 dark:bg-gradient-to-br dark:from-teal-700 dark:to-black text-white hover:bg-gray-800 dark:hover:from-teal-600 dark:hover:to-black focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-black focus:ring-gray-400 dark:focus:ring-teal-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-sm flex items-center justify-center"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign in' : 'Sign up'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-black text-gray-600 dark:text-white/60">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Button */}
            <GoogleOAuthProvider clientId="970893892840-8ecshtmle4kip6ps0bl7vbkg3nogl5od.apps.googleusercontent.com">
              <button
                onClick={handleGoogleLogin}
                type="button"
                className="w-full py-2.5 px-4 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-teal-400 transition-all text-sm font-medium text-gray-700 dark:text-white/80 flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>
            </GoogleOAuthProvider>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-gray-600 dark:text-white/60 pt-4 border-t border-gray-300 dark:border-white/10">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={toggleMode}
              className="font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-white/80 transition-colors"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Auth;