import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Copy, 
  Lock, 
  Mail, 
  Square,
  ChevronRight,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { getAvatarById, DEFAULT_AVATAR } from '../assets/avatars';
import { userService } from '../services/userService';
import AvatarSelector from '../components/AvatarSelector';

const SettingsPage: React.FC = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState(user?.username || '');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const formatShortId = (id: string) => {
    try {
      const hex = id.replace(/-/g, '');
      const num = BigInt('0x' + hex) % BigInt(100000000);
      const s = num.toString();
      return s.padStart(8, '0');
    } catch {
      return id.slice(0, 8);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleAvatarSelect = async (avatarId: string) => {
    try {
      setIsLoading(true);
      const updated = await userService.updateProfile({ avatarUrl: avatarId });
      setUser((prev) => (prev ? { ...prev, ...updated } : prev));
      setShowAvatarSelector(false);
      toast.success('Avatar updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update avatar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNicknameUpdate = async () => {
    if (!newNickname.trim()) {
      toast.error('Nickname cannot be empty');
      return;
    }
    
    try {
      setIsLoading(true);
      const updated = await userService.updateProfile({ username: newNickname.trim() });
      setUser((prev) => (prev ? { ...prev, ...updated } : prev));
      setEditingNickname(false);
      toast.success('Nickname updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update nickname');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    
    try {
      setIsLoading(true);
      await userService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      toast.success('Password updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-gold-600 to-gold-700 text-white p-4 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="text-white hover:text-gray-200"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold">Settings center</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Profile Information */}
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
          <div className="space-y-4">
            {/* Avatar */}
            <button 
              onClick={() => setShowAvatarSelector(true)}
              className="flex items-center justify-between w-full hover:bg-gray-700 rounded-lg p-2 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full border-2 border-gold-500 overflow-hidden">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl.startsWith('http') ? user.avatarUrl : getAvatarById(user.avatarUrl).path}
                      alt={user.avatarUrl.startsWith('http') ? "User Avatar" : getAvatarById(user.avatarUrl).name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <User className="h-6 w-6 text-gray-400" />
                </div>
                <span className="text-gray-300">Change avatar</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>

            {/* Nickname */}
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Nickname</span>
              <div className="flex items-center gap-2">
                {editingNickname ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleNicknameUpdate}
                      disabled={isLoading}
                      className="text-green-400 hover:text-green-300 p-1"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingNickname(false);
                        setNewNickname(user.username);
                      }}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">{user.username}</span>
                    <button
                      onClick={() => setEditingNickname(true)}
                      className="text-gold-400 hover:text-gold-300 p-1"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* UID */}
            <div className="flex items-center justify-between">
              <span className="text-gray-300">UID</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-300">{formatShortId(user.id)}</span>
                <button 
                  onClick={() => copyToClipboard(user.id)}
                  className="text-gold-400 hover:text-gold-300 p-1 rounded hover:bg-gray-600 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-gold-500 rounded"></div>
            <h2 className="text-white font-medium">Security information</h2>
          </div>

          {/* Login Password */}
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold-500/20 rounded-full flex items-center justify-center">
                  <Lock className="h-5 w-5 text-gold-400" />
                </div>
                <span className="text-gray-300">Login password</span>
              </div>
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="text-gold-400 hover:text-gold-300 flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                {showPasswordForm ? 'Cancel' : 'Edit'}
              </button>
            </div>
            
            {showPasswordForm && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePasswordChange}
                    disabled={isLoading}
                    className="bg-gold-500 hover:bg-gold-600 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isLoading ? 'Updating...' : 'Update Password'}
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bind Mailbox */}
          <button className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 w-full hover:bg-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold-500/20 rounded-full flex items-center justify-center">
                  <Mail className="h-5 w-5 text-gold-400" />
                </div>
                <span className="text-gray-300">Bind mailbox</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </button>

          {/* Updated Version */}
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold-500/20 rounded-full flex items-center justify-center">
                  <Square className="h-5 w-5 text-gold-400" />
                </div>
                <span className="text-gray-300">Updated version</span>
              </div>
              <span className="text-gray-300">1.0.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Selector Modal */}
      {showAvatarSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Select Avatar</h3>
              <button
                onClick={() => setShowAvatarSelector(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <AvatarSelector
              selectedAvatar={user?.avatarUrl || DEFAULT_AVATAR.id}
              onAvatarSelect={handleAvatarSelect}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
