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
  const [agreedToLegal, setAgreedToLegal] = useState(false);
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | null>(null);
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

      if (mode === 'signup' && !agreedToLegal) {
        setStatus({ type: 'error', message: "You must agree to our Terms of Service and Privacy Policy to sign up." });
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
            {/* Legal Agreement - Signup Only */}
            {mode === 'signup' && (
              <div className="flex items-start gap-3 pt-2">
                <input
                  id="legal"
                  type="checkbox"
                  checked={agreedToLegal}
                  onChange={(e) => setAgreedToLegal(e.target.checked)}
                  className="h-4 w-4 mt-1 border border-gray-300 dark:border-white/10 rounded bg-white dark:bg-white/5 cursor-pointer flex-shrink-0 accent-gray-900 dark:accent-teal-400"
                />
                <label htmlFor="legal" className="text-sm text-gray-600 dark:text-white/70 leading-relaxed cursor-pointer">
                  I agree to Rigzer's{' '}
                  <button
                    type="button"
                    onClick={() => setActiveModal('terms')}
                    className="font-medium text-gray-900 dark:text-white hover:underline transition-colors"
                  >
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    onClick={() => setActiveModal('privacy')}
                    className="font-medium text-gray-900 dark:text-white hover:underline transition-colors"
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>
            )}

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

      {/* Terms Modal */}
      {activeModal === 'terms' && (
        <>
          {/* Modal Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          />

          {/* Modal Content */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              style={{ background: bodyBg, border: `1px solid ${borderColor}` }}
              className="w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div
                style={{ background: gradient , borderColor: borderColor}}
                className="text-white px-6 py-4 border-b"
              >
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Terms of Service
                </h2>
                <p className="text-sm text-gray-900 dark:text-white mt-1">Please read carefully before proceeding</p>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                <section>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">1. Acceptance of Terms</h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-white/85">
                    By accessing and using Rigzer, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">2. Use License</h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-white/85 mb-2">
                    Permission is granted to temporarily download one copy of the materials (information or software) on Rigzer for personal, non-commercial transitory viewing only. Under this license you may not:
                  </p>
                  <ul className="text-sm leading-relaxed list-disc list-inside space-y-1.5 text-gray-700 dark:text-white/85">
                    <li>Modify or copy the materials</li>
                    <li>Use materials for commercial purposes</li>
                    <li>Attempt to decompile or reverse engineer software</li>
                    <li>Transmit illicit content</li>
                    <li>Remove copyright or proprietary notations</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">3. User Accounts</h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-white/85">
                    You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">4. Disclaimer</h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-white/85">
                    The materials on Rigzer are provided "as is". Rigzer makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including implied warranties of merchantability or fitness for a particular purpose.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">5. Limitations of Liability</h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-white/85">
                    In no event shall Rigzer or its suppliers be liable for any damages (including loss of data or profit) arising out of the use or inability to use the materials on Rigzer.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">6. Modifications</h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-white/85">
                    Rigzer may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
                  </p>
                </section>
              </div>

              {/* Modal Footer */}
              <div
                className="px-6 py-4 border-t flex justify-end gap-3"
                style={{ borderColor: borderColor }}
              >
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 transition-colors font-medium text-sm"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setAgreedToLegal(true);
                    setActiveModal(null);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-gray-900 dark:bg-gradient-to-br dark:from-teal-700 dark:to-black text-white hover:bg-gray-800 dark:hover:from-teal-600 dark:hover:to-black transition-all font-medium text-sm"
                >
                  I Agree
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Privacy Modal */}
      {activeModal === 'privacy' && (
        <>
          {/* Modal Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          />

          {/* Modal Content */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              style={{ background: bodyBg, border: `1px solid ${borderColor}` }}
              className="w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div
                style={{ background: gradient , borderColor: borderColor }}
                className="text-white px-6 py-4 border-b"

              >
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Privacy Policy
                </h2>
                <p className="text-sm text-gray-900 dark:text-white mt-1">How we handle your data</p>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                <section>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">1. Introduction</h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-white/85">
                    Rigzer ("we" or "us" or "our") respects the privacy of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">2. Information We Collect</h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-white/85 mb-3">
                    We collect information you provide directly such as:
                  </p>
                  <ul className="text-sm leading-relaxed list-disc list-inside space-y-1.5 text-gray-700 dark:text-white/85">
                    <li><span className="text-gray-900 dark:text-white font-semibold">Account Information:</span> Name, email, username, password</li>
                    <li><span className="text-gray-900 dark:text-white font-semibold">Usage Data:</span> Browser type, IP address, pages visited, time spent</li>
                    <li><span className="text-gray-900 dark:text-white font-semibold">Cookies:</span> We use cookies for tracking and preferences</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">3. How We Use Your Information</h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-white/85 mb-2">
                    We use collected data for various purposes:
                  </p>
                  <ul className="text-sm leading-relaxed list-disc list-inside space-y-1.5 text-gray-700 dark:text-white/85">
                    <li>Provide and maintain our Service</li>
                    <li>Notify you about changes to our Service</li>
                    <li>Allow participation in interactive features</li>
                    <li>Provide customer support</li>
                    <li>Gather analysis to improve our Service</li>
                    <li>Monitor usage and detect fraud</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">4. Cookies and Tracking Technologies</h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-white/85">
                    We use cookies and similar tracking technologies to track activity on our Service. You can instruct your browser to refuse all cookies or to alert you when cookies are being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">5. Security of Your Data</h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-white/85">
                    The security of your data is important to us. However, no method of transmission over the Internet is 100% secure. We strive to use commercially acceptable means to protect your personal information, but we cannot guarantee absolute security.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">6. Data Retention</h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-white/85">
                    We retain your personal information for as long as necessary to provide our Service and fulfill the purposes outlined in this Privacy Policy. You can request deletion of your data at any time.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">7. Your Rights</h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-white/85">
                    You have the right to access, correct, or delete your personal information. You can contact us at support@rigzer.com to exercise these rights.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">8. Contact Us</h3>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-white/85">
                    If you have any questions about this Privacy Policy or our privacy practices, please contact us at support@rigzer.com or visit our website.
                  </p>
                </section>
              </div>

              {/* Modal Footer */}
              <div
                className="px-6 py-4 border-t flex justify-end gap-3"
                style={{ borderColor: borderColor }}
              >
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 transition-colors font-medium text-sm"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setAgreedToLegal(true);
                    setActiveModal(null);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-gray-900 dark:bg-gradient-to-br dark:from-teal-700 dark:to-black text-white hover:bg-gray-800 dark:hover:from-teal-600 dark:hover:to-black transition-all font-medium text-sm"
                >
                  I Agree
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Auth;