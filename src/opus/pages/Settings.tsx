import React, { useEffect, useState } from "react";
import { usePortal } from "../context/PortalContext";
import { User, Shield, Phone, Key, Check, AlertCircle } from "lucide-react";
import {
  createProfileFormState,
  createPasswordFormState,
  createUIState,
  createMessageState,
  createAvatarState,
} from "../utils/stateGrouping";

const AVATAR_PRESETS = [
  {
    id: "slate",
    name: "Slate Concrete",
    colors: "from-[#2e2f33] to-[#1e1f22]",
    text: "text-[#a0a5b0]",
  },
  {
    id: "safety",
    name: "Safety Yellow",
    colors: "from-[#eab308] to-[#ca8a04]",
    text: "text-[#1e1b4b]",
  },
  { id: "steel", name: "Steel Grate", colors: "from-[#64748b] to-[#475569]", text: "text-white" },
  { id: "amber", name: "Amber Warning", colors: "from-[#f97316] to-[#ea580c]", text: "text-white" },
  { id: "rust", name: "Iron Rust", colors: "from-[#ef4444] to-[#dc2626]", text: "text-white" },
  {
    id: "midnight",
    name: "Midnight Cyan",
    colors: "from-[#06b6d4] to-[#0891b2]",
    text: "text-[#0f172a]",
  },
];

export const getAvatarPresetClass = (presetId: string) => {
  const preset = AVATAR_PRESETS.find((p) => p.id === presetId);
  return preset ? `${preset.colors} ${preset.text}` : "from-primary/20 to-primary/30 text-primary";
};

export const SettingsPage: React.FC = () => {
  const { user, role, profile, updateProfile, updatePassword } = usePortal();

  // Profile fields state - grouped
  const [profileForm, setProfileForm] = useState(createProfileFormState(profile));
  // Password fields state - grouped
  const [passwordForm, setPasswordForm] = useState(createPasswordFormState());
  // UI state - grouped
  const [ui, setUi] = useState(createUIState());
  // Message state - grouped
  const [messages, setMessages] = useState(createMessageState());
  // Avatar state - derived
  const [avatar, setAvatar] = useState(createAvatarState(profile?.full_name, user?.email));

  // Hydrate fields from profile context
  useEffect(() => {
    if (profile) {
      setProfileForm(createProfileFormState(profile));
      setAvatar(createAvatarState(profile.full_name, user?.email));
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUi((prev) => ({ ...prev, isSavingProfile: true }));
    setMessages((prev) => ({ ...prev, profileMessage: null }));

    const { error } = await updateProfile({
      full_name: profileForm.fullName,
      phone_number: profileForm.phone,
      avatar_url: profileForm.selectedAvatar,
    });

    setUi((prev) => ({ ...prev, isSavingProfile: false }));
    if (error) {
      setMessages((prev) => ({ ...prev, profileMessage: { type: "error", text: error } }));
    } else {
      setMessages((prev) => ({
        ...prev,
        profileMessage: { type: "success", text: "Profile details saved successfully." },
      }));
      setTimeout(() => setMessages((prev) => ({ ...prev, profileMessage: null })), 3000);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessages((prev) => ({ ...prev, passwordMessage: null }));

    if (passwordForm.newPassword.length < 8) {
      setMessages((prev) => ({
        ...prev,
        passwordMessage: {
          type: "error",
          text: "New password must be at least 8 characters long.",
        },
      }));
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessages((prev) => ({
        ...prev,
        passwordMessage: { type: "error", text: "New passwords do not match." },
      }));
      return;
    }

    setUi((prev) => ({ ...prev, isUpdatingPassword: true }));
    const { error } = await updatePassword(passwordForm.newPassword);
    setUi((prev) => ({ ...prev, isUpdatingPassword: false }));

    if (error) {
      setMessages((prev) => ({ ...prev, passwordMessage: { type: "error", text: error } }));
    } else {
      setMessages((prev) => ({
        ...prev,
        passwordMessage: { type: "success", text: "Password successfully updated." },
      }));
      setPasswordForm(createPasswordFormState());
      setTimeout(() => setMessages((prev) => ({ ...prev, passwordMessage: null })), 3000);
    }
  };

  const getUserInitials = () => avatar.initials;

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-4xl mx-auto animate-fade-in space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-widest text-foreground/85">
          Profile Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-1 uppercase font-bold tracking-wider">
          Manage your account credentials, preferences, and avatar preset
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Avatar selector card */}
        <div className="md:col-span-1 bg-card border border-border rounded-xl p-5 space-y-6 flex flex-col items-center">
          <div className="text-xs font-black uppercase tracking-widest text-muted-foreground self-start">
            Profile Image
          </div>

          {/* Avatar Preview */}
          <div
            className={`w-28 h-28 rounded-full bg-gradient-to-br ${getAvatarPresetClass(profileForm.selectedAvatar)} flex items-center justify-center border-2 border-border shadow-2xl relative transition-all duration-300`}
          >
            <span className="text-3xl font-black tracking-widest">{getUserInitials()}</span>
          </div>

          {/* Presets Grid */}
          <div className="w-full space-y-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Select Preset
            </div>
            <div className="grid grid-cols-3 gap-2">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setProfileForm((prev) => ({ ...prev, selectedAvatar: preset.id }))}
                  title={preset.name}
                  className={`h-10 rounded-lg bg-gradient-to-br ${preset.colors} border-2 relative transition-all ${
                    profileForm.selectedAvatar === preset.id
                      ? "border-foreground scale-105 shadow-md"
                      : "border-border opacity-75 hover:opacity-100"
                  }`}
                >
                  {profileForm.selectedAvatar === preset.id && (
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
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <User className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/85">
                Account Details
              </h3>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {messages.profileMessage && (
                <div
                  className={`flex items-center gap-2 p-3.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                    messages.profileMessage.type === "success"
                      ? "bg-success/10 border border-success/30 text-success"
                      : "bg-destructive/10 border border-destructive/30 text-destructive"
                  }`}
                >
                  {messages.profileMessage.type === "success" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{messages.profileMessage.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-black tracking-widest text-muted-foreground uppercase">
                    Email (Read Only)
                  </span>
                  <div className="flex items-center gap-2 bg-background/50 border border-border/60 rounded-lg p-3 px-4 text-muted-foreground cursor-not-allowed">
                    <span className="text-xs font-bold">{user?.email || ""}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-black tracking-widest text-muted-foreground uppercase">
                    System Role
                  </span>
                  <div className="flex items-center gap-2 bg-background/50 border border-border/60 rounded-lg p-3 px-4 text-muted-foreground cursor-not-allowed">
                    <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold capitalize">
                      {(role || "labourer").replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black tracking-widest text-muted-foreground uppercase">
                  Full Name
                </span>
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-3 px-4 focus-within:border-muted-foreground transition-colors">
                  <input
                    type="text"
                    required
                    className="w-full bg-transparent border-none outline-none text-foreground text-xs placeholder:text-muted-foreground font-bold"
                    value={profileForm.fullName}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black tracking-widest text-muted-foreground uppercase">
                  Phone Number
                </span>
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-3 px-4 focus-within:border-muted-foreground transition-colors">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="tel"
                    className="w-full bg-transparent border-none outline-none text-foreground text-xs placeholder:text-muted-foreground font-bold"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+44 7700 900077"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={ui.isSavingProfile}
                className="w-full sm:w-auto bg-secondary border border-border hover:bg-secondary/80 text-secondary-foreground text-[11px] font-black tracking-widest uppercase py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                {ui.isSavingProfile ? "Saving..." : "Save Profile Details"}
              </button>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Key className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/85">
                Security / Update Password
              </h3>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              {messages.passwordMessage && (
                <div
                  className={`flex items-center gap-2 p-3.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                    messages.passwordMessage.type === "success"
                      ? "bg-success/10 border border-success/30 text-success"
                      : "bg-destructive/10 border border-destructive/30 text-destructive"
                  }`}
                >
                  {messages.passwordMessage.type === "success" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{messages.passwordMessage.text}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black tracking-widest text-muted-foreground uppercase">
                  Current Password
                </span>
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-3 px-4 focus-within:border-muted-foreground transition-colors">
                  <input
                    type="password"
                    required
                    className="w-full bg-transparent border-none outline-none text-foreground text-xs placeholder:text-muted-foreground font-bold"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                    }
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-black tracking-widest text-muted-foreground uppercase">
                    New Password
                  </span>
                  <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-3 px-4 focus-within:border-muted-foreground transition-colors">
                    <input
                      type="password"
                      required
                      className="w-full bg-transparent border-none outline-none text-foreground text-xs placeholder:text-muted-foreground font-bold"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                      placeholder="Min 8 characters"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-black tracking-widest text-muted-foreground uppercase">
                    Confirm New Password
                  </span>
                  <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-3 px-4 focus-within:border-muted-foreground transition-colors">
                    <input
                      type="password"
                      required
                      className="w-full bg-transparent border-none outline-none text-foreground text-xs placeholder:text-muted-foreground font-bold"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      placeholder="Match new password"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={ui.isUpdatingPassword}
                className="w-full sm:w-auto bg-secondary border border-border hover:bg-secondary/80 text-secondary-foreground text-[11px] font-black tracking-widest uppercase py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                {ui.isUpdatingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
