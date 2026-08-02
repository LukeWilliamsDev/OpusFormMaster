/**
 * State grouping patterns for common React patterns
 * Reduces re-renders by grouping related state together
 */

// Profile form state pattern
export const createProfileFormState = (
  profile?: {
    full_name?: string;
    phone_number?: string;
    avatar_url?: string;
  } | null,
) => ({
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

// ============================================================
// NEW PATTERNS FOR AUDIT REFACTORING
// ============================================================

// Form field state with validation
export const createFormFieldState = <T>(initialValue: T) => ({
  value: initialValue,
  error: null as string | null,
  touched: false,
});

// Search/filter state pattern
export const createSearchState = () => ({
  query: "",
  debouncedQuery: "",
  isFocused: false,
});

// Pagination state pattern
export const createPaginationState = () => ({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
});

// Modal/dialog state pattern
export const createModalState = <T>() => ({
  isOpen: false,
  data: null as T | null,
  loading: false,
});

// Stepper/wizard state pattern
export const createStepperState = <T extends string[]>(steps: T) => ({
  currentStep: 0,
  stepLabels: steps,
  completedSteps: [] as number[],
});

// File upload state pattern
export const createFileUploadState = () => ({
  files: [] as File[],
  uploading: false,
  uploadProgress: 0,
  uploadedUrls: [] as string[],
  error: null as string | null,
});

// Data fetching state pattern
export const createDataFetchState = <T>() => ({
  data: null as T | null,
  loading: false,
  error: null as string | null,
  lastFetched: null as Date | null,
});

// Selection state pattern (for lists/grids)
export const createSelectionState = <T>() => ({
  selectedIds: [] as string[],
  selectedItems: [] as T[],
  selectAll: false,
});

// Snooze/dismiss state pattern (for alerts/notifications)
export const createSnoozeState = () => ({
  snoozedIds: new Set<string>(),
  dismissedIds: new Set<string>(),
});

// Confirmation dialog state pattern
export const createConfirmState = <T>() => ({
  isOpen: false,
  data: null as T | null,
  confirmLoading: false,
});

// Avatar/initials state pattern
export const createAvatarState = (fullName?: string, email?: string) => ({
  initials: fullName
    ? fullName
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0].toUpperCase())
        .join("")
        .slice(0, 2)
    : email
      ? email.slice(0, 2).toUpperCase()
      : "OP",
  preset: "slate" as const,
});
