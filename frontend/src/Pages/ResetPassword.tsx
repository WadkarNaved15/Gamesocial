import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/auth/reset-password`, {
        token,
        newPassword: password
      });
      setIsSuccess(true);
      setTimeout(() => navigate("/auth?add=true"), 3000);
    } catch (err) {
      setError("Invalid or expired reset link. Please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080A09] text-white flex items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Subtle background effects matching the Auth screen */}
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

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#080A09]/90 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-2xl p-8 sm:p-10 space-y-8">
          
          <div className="text-center space-y-2 animate-fade-up">
            <h2 className="text-2xl font-semibold text-white tracking-tight">
              New Password
            </h2>
            <p className="text-sm text-white/50">
              Set a strong password for your account.
            </p>
          </div>

          {!token ? (
            <div className="p-4 rounded-lg flex flex-col items-center gap-3 bg-red-500/10 text-red-400 border border-red-500/20 text-center animate-fade-up">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm font-medium">Invalid or missing reset link.</p>
            </div>
          ) : isSuccess ? (
            <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-[#62D4AE]" />
              </div>
              <p className="text-lg font-medium text-white">Password Updated!</p>
              <p className="text-sm text-white/50">Redirecting you to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 animate-fade-up" style={{ animationDelay: '0.1s' }}>
              {error && (
                <div className="p-4 rounded-lg flex items-center gap-3 bg-red-500/10 text-red-400 border border-red-500/20">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-white/70">New Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#62D4AE] transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE]/50 focus:ring-1 focus:ring-[#62D4AE]/50 text-white placeholder-white/20 transition-all text-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-white/70">Confirm Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#62D4AE] transition-colors" />
                  <input
                    type="password"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE]/50 focus:ring-1 focus:ring-[#62D4AE]/50 text-white placeholder-white/20 transition-all text-sm"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="group relative w-full overflow-hidden inline-flex items-center justify-center gap-2 text-[14px] font-medium px-4 py-3 mt-4 rounded-lg cursor-pointer bg-[#62D4AE]/10 border border-[#62D4AE]/40 text-[#62D4AE] transition-all duration-200 outline-none hover:bg-[#62D4AE]/20 hover:border-[#62D4AE]/70 hover:text-[#8de8ca] hover:shadow-[0_0_24px_rgba(98,212,174,0.18),inset_0_0_12px_rgba(98,212,174,0.05)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Update Password"
                  )}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fadeUp 0.9s ease forwards; opacity: 0; }
      `}</style>
    </div>
  );
}