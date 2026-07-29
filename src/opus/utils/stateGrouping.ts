/**
 * State grouping patterns for common React patterns
 * Reduces re-renders by grouping related state together
 */

// Profile form state pattern
export const createProfileFormState = (profile?: any) => ({
  fullName: profile?.full_name || "",
  phone: profile?.phone_number || "",
  selectedAvatar: profile?.avatar_url || "slate",
});

// Password form state pattern
export const createPasswordFormState = () => ({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

// UI state pattern (loading, saving, etc.)
export const createUIState = () => ({
  isSaving: false,
  isUpdating: false,
  isLoading: false,
});

// Message state pattern (errors, success, etc.)
export const createMessageState = () => ({
  message: null as { type: "success" | "error"; text: string } | null,
  errorMessage: null as string | null,
});

// Credentials form pattern
export const createCredentialsFormState = () => ({
  selectedCerts: [] as string[],
  customInput: "",
  sendEmail: true,
});

// Generic async operation state
export const createAsyncState = () => ({
  loading: false,
  success: false,
  error: null as string | null,
});
