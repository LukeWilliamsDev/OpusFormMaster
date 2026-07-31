/**
 * Centralized error handler for async operations
 * Eliminates repetitive try-catch boilerplate across components
 */

export interface ErrorHandlerOptions {
  message?: string;
  fallback?: string;
  log?: boolean;
}

export const handleError = (error: unknown, options: ErrorHandlerOptions = {}) => {
  const { message = "An error occurred", fallback = "Unknown error", log = true } = options;

  const errorMessage = error instanceof Error ? error.message : fallback;

  if (log) {
    console.error(message, error);
  }

  return {
    message: `${message}: ${errorMessage}`,
    error,
  };
};

export const asyncHandler = async <T>(
  fn: () => Promise<T>,
  errorMessage = "Operation failed",
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    const { message } = handleError(err, { message: errorMessage });
    return { success: false, error: message };
  }
};
