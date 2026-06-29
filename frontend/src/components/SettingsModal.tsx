import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import axios from 'axios';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView: 'password' | 'delete';
}

type ViewState = 'password' | 'delete';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function SettingsModal({ isOpen, onClose, initialView }: SettingsModalProps) {
  const [view, setView] = useState<ViewState>(initialView);
  
  // Sync the view state when the modal is opened with a specific initialView
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
    }
  }, [isOpen, initialView]);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Global form state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setError('');
    setSuccess('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${BACKEND_URL}/api/users/update-password`, {
        currentPassword,
        newPassword
      }, { withCredentials: true });
      
      setSuccess("Password updated successfully.");
      setTimeout(handleClose, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setError('');
    setLoading(true);
    try {
      await axios.delete(`${BACKEND_URL}/api/users/delete-account`, {
        withCredentials: true 
      });
      window.location.href = '/auth'; 
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete account.");
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="w-full max-w-md rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#191919] shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {view === 'password' ? 'Change Password' : 'Delete Account'}
          </h2>
          <button 
            onClick={handleClose} 
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Notifications (Only show outside of the delete view to maintain clean UI) */}
        {(error || success) && view !== 'delete' && (
          <div className="px-6 pt-6 pb-0">
            {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-500/20">{error}</div>}
            {success && <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm border border-emerald-100 dark:border-emerald-500/20">{success}</div>}
          </div>
        )}

        {/* VIEW: Password */}
        {view === 'password' && (
          <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-white/70">Current Password</label>
              <input 
                type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE] text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-white/70">New Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE] text-gray-900 dark:text-white text-sm"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-white/70">Confirm New Password</label>
              <input 
                type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-[#62D4AE] text-gray-900 dark:text-white text-sm"
              />
            </div>
            <button disabled={loading} type="submit" className="w-full mt-2 py-2.5 bg-[#62D4AE] hover:bg-[#4eb392] text-black font-medium rounded-lg transition-colors disabled:opacity-50 text-sm">
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        {/* VIEW: Delete */}
        {view === 'delete' && (
          <div className="flex flex-col">
            
            {/* Error Message specific to Delete View */}
            {error && (
              <div className="px-6 pt-6">
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-500/20">{error}</div>
              </div>
            )}

            {/* Main Content */}
            <div className="p-6 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="text-red-500" size={28} />
              </div>

              <h2 className="text-xl font-black text-gray-900 dark:text-white">
                Delete Account?
              </h2>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                This action cannot be undone. <br />
                All of your data, posts, and settings will be permanently erased.
              </p>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 border-t border-gray-200 dark:border-white/10">
              <button
                onClick={handleClose}
                disabled={loading}
                className="h-12 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white font-bold transition-all"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all active:scale-95"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
            
          </div>
        )}

      </div>
    </div>
  );
}