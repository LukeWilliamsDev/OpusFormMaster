import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export const ThirdPartyDataError: React.FC<{
  message: string;
  onRetry: () => void;
}> = ({ message, onRetry }) => (
  <section
    role="alert"
    className="mx-auto max-w-3xl rounded-2xl border border-destructive/40 bg-card p-6 text-center"
  >
    <AlertCircle className="mx-auto h-6 w-6 text-destructive" aria-hidden="true" />
    <h2 className="mt-3 text-lg font-black">We couldn’t load this portal data</h2>
    <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-black uppercase tracking-wider text-primary-foreground"
    >
      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
      Try again
    </button>
  </section>
);
