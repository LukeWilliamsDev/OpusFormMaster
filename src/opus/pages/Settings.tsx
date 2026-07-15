// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { usePortal } from '../context/PortalContext';
import { User, Shield, Phone, Key, Check, AlertCircle } from 'lucide-react';

const AVATAR_PRESETS = [
  { id: 'slate', name: 'Slate Concrete', colors: 'from-[#2e2f33] to-[#1e1f22]', text: 'text-[#a0a5b0]' },
  { id: 'safety', name: 'Safety Yellow', colors: 'from-[#eab308] to-[#ca8a04]', text: 'text-[#1e1b4b]' },
  { id: 'steel', name: 'Steel Grate', colors: 'from-[#64748b] to-[#475569]', text: 'text-white' },
  { id: 'amber', name: 'Amber Warning', colors: 'from-[#f97316] to-[#ea580c]', text: 'text-white' },
  { id: 'rust', name: 'Iron Rust', colors: 'from-[#ef4444] to-[#dc2626]', text: 'text-white' },
  { id: 'midnight', name: 'Midnight Cyan', colors: 'from-[#06b6d4] to-[#0891b2]', text: 'text-[#0f172a]' },
];

export const getAvatarPresetClass = (presetId: string) => {
  const preset = AVATAR_PRESETS.find(p => p.id === presetId);
  return preset ? `${preset.colors} ${preset.text}` : 'from-[#6C8295]/20 to-[#6C8295]/30 text-[#6C8295]';
};

export const SettingsPage: React.FC = () => {
  const { user, role, profile, updateProfile, updatePassword } = usePortal();
  
  // Profile fields state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('slate');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Hydrate fields from profile context
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone_number || '');
      setSelectedAvatar(profile.avatar_url || 'slate');
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage(null);

    const { error } = await updateProfile({
      full_name: fullName,
      phone_number: phone,
      avatar_url: selectedAvatar
    });

    setIsSavingProfile(false);
    if (error) {
      setProfileMessage({ type: 'error', text: error });
    } else {
      setProfileMessage({ type: 'success', text: 'Profile details saved successfully.' });
      setTimeout(() => setProfileMessage(null), 3000);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsUpdatingPassword(true);
    const { error } = await updatePassword(newPassword);
    setIsUpdatingPassword(false);

    if (error) {
      setPasswordMessage({ type: 'error', text: error });
    } else {
      setPasswordMessage({ type: 'success', text: 'Password successfully updated.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(null), 3000);
    }
  };

  const getUserInitials = () => {
    if (fullName) {
      const parts = fullName.split(' ');
      return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email ? user.email.slice(0, 2).toUpperCase() : 'OP';
  };

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-4xl mx-auto animate-fade-in space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-widest text-white">Profile Settings</h1>
        <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-wider">Manage your account credentials, preferences, and avatar preset</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Avatar selector card */}
        <div className="md:col-span-1 bg-[#1a1a1e] border border-[#2a2a30] rounded-xl p-5 space-y-6 flex flex-col items-center">
          <div className="text-xs font-black uppercase tracking-widest text-gray-400 self-start">Profile Image</div>
          
          {/* Avatar Preview */}
          <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${getAvatarPresetClass(selectedAvatar)} flex items-center justify-center border-2 border-[#2a2a30] shadow-2xl relative transition-all duration-300`}>
            <span className="text-3xl font-black tracking-widest">{getUserInitials()}</span>
          </div>

          {/* Presets Grid */}
          <div className="w-full space-y-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-600">Select Preset</div>
            <div className="grid grid-cols-3 gap-2">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedAvatar(preset.id)}
                  title={preset.name}
                  className={`h-10 rounded-lg bg-gradient-to-br ${preset.colors} border-2 relative transition-all ${
                    selectedAvatar === preset.id ? 'border-white scale-105 shadow-md' : 'border-[#2a2a30] opacity-75 hover:opacity-100'
                  }`}
                >
                  {selectedAvatar === preset.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
                      <Check className={`w-4 h-4 ${preset.text}`} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Account Details & Password Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Account Details Card */}
          <div className="bg-[#1a1a1e] border border-[#2a2a30] rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-[#2a2a30] pb-3">
              <User className="w-4 h-4 text-[#6C8295]" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Account Details</h3>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {profileMessage && (
                <div className={`flex items-center gap-2 p-3.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                  profileMessage.type === 'success' ? 'bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981]' : 'bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444]'
                }`}>
                  {profileMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{profileMessage.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-black tracking-widest text-gray-400 uppercase">Email (Read Only)</span>
                  <div className="flex items-center gap-2 bg-[#111114]/50 border border-[#2a2a30]/60 rounded-lg p-3 px-4 text-gray-600 cursor-not-allowed">
                    <span className="text-xs font-bold">{user?.email || ''}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-black tracking-widest text-gray-400 uppercase">System Role</span>
                  <div className="flex items-center gap-2 bg-[#111114]/50 border border-[#2a2a30]/60 rounded-lg p-3 px-4 text-gray-600 cursor-not-allowed">
                    <Shield className="w-3.5 h-3.5 text-gray-600" />
                    <span className="text-xs font-bold capitalize">{role || 'operative'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black tracking-widest text-gray-400 uppercase">Full Name</span>
                <div className="flex items-center gap-2 bg-[#111114] border border-[#2a2a30] rounded-lg p-3 px-4 focus-within:border-gray-500 transition-colors">
                  <input
                    type="text"
                    required
                    className="w-full bg-transparent border-none outline-none text-white text-xs placeholder:text-gray-700 font-bold"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black tracking-widest text-gray-400 uppercase">Phone Number</span>
                <div className="flex items-center gap-2 bg-[#111114] border border-[#2a2a30] rounded-lg p-3 px-4 focus-within:border-gray-500 transition-colors">
                  <Phone className="w-4 h-4 text-gray-600 shrink-0" />
                  <input
                    type="tel"
                    className="w-full bg-transparent border-none outline-none text-white text-xs placeholder:text-gray-700 font-bold"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+44 7700 900077"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full sm:w-auto bg-[#2e2e2e] border border-[#3a3a3a] hover:bg-[#383838] text-white text-[11px] font-black tracking-widest uppercase py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSavingProfile ? 'Saving...' : 'Save Profile Details'}
              </button>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-[#1a1a1e] border border-[#2a2a30] rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-[#2a2a30] pb-3">
              <Key className="w-4 h-4 text-[#6C8295]" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Security / Update Password</h3>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              {passwordMessage && (
                <div className={`flex items-center gap-2 p-3.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                  passwordMessage.type === 'success' ? 'bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981]' : 'bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444]'
                }`}>
                  {passwordMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{passwordMessage.text}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black tracking-widest text-gray-400 uppercase">Current Password</span>
                <div className="flex items-center gap-2 bg-[#111114] border border-[#2a2a30] rounded-lg p-3 px-4 focus-within:border-gray-500 transition-colors">
                  <input
                    type="password"
                    required
                    className="w-full bg-transparent border-none outline-none text-white text-xs placeholder:text-gray-700 font-bold"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-black tracking-widest text-gray-400 uppercase">New Password</span>
                  <div className="flex items-center gap-2 bg-[#111114] border border-[#2a2a30] rounded-lg p-3 px-4 focus-within:border-gray-500 transition-colors">
                    <input
                      type="password"
                      required
                      className="w-full bg-transparent border-none outline-none text-white text-xs placeholder:text-gray-700 font-bold"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-black tracking-widest text-gray-400 uppercase">Confirm New Password</span>
                  <div className="flex items-center gap-2 bg-[#111114] border border-[#2a2a30] rounded-lg p-3 px-4 focus-within:border-gray-500 transition-colors">
                    <input
                      type="password"
                      required
                      className="w-full bg-transparent border-none outline-none text-white text-xs placeholder:text-gray-700 font-bold"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Match new password"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full sm:w-auto bg-[#2e2e2e] border border-[#3a3a3a] hover:bg-[#383838] text-white text-[11px] font-black tracking-widest uppercase py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
