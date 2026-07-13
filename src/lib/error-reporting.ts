type ErrorReportingOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type ErrorReportingEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: ErrorReportingOptions,
  ) => void;
};

declare global {
  interface Window {
    __errorEvents?: ErrorReportingEvents;
    __lovableEvents?: ErrorReportingEvents; // Fallback in case legacy scripts populate it
  }
}

export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  
  // Try custom error handler or fallback to legacy Lovable handler
  const handler = window.__errorEvents?.captureException || window.__lovableEvents?.captureException;
  
  if (handler) {
    handler(
      error,
      {
        source: "react_error_boundary",
        route: window.location.pathname,
        ...context,
      },
      {
        mechanism: "react_error_boundary",
        handled: false,
        severity: "error",
      },
    );
  } else {
    console.error("[ErrorReporting]", error, context);
  }
}
