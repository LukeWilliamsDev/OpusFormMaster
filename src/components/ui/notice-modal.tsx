"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type NoticeTone = "info" | "success" | "warning" | "error";

const toneDot: Record<NoticeTone, string> = {
  info: "bg-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_25%,transparent)]",
  success: "bg-success shadow-[0_0_0_3px_color-mix(in_srgb,var(--success)_25%,transparent)]",
  warning: "bg-warning shadow-[0_0_0_3px_color-mix(in_srgb,var(--warning)_25%,transparent)]",
  error: "bg-destructive shadow-[0_0_0_3px_color-mix(in_srgb,var(--destructive)_25%,transparent)]",
};

const toneBorder: Record<NoticeTone, string> = {
  info: "",
  success: "border-success/35",
  warning: "border-warning/35",
  error: "border-destructive/35",
};

const toneLabel: Record<NoticeTone, string> = {
  info: "Notice",
  success: "Success",
  warning: "Warning",
  error: "Error",
};

export interface NoticeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tone?: NoticeTone;
  tag?: string;
  title: string;
  message: React.ReactNode;
  actionLabel?: string;
}

export function NoticeModal({
  open,
  onOpenChange,
  tone = "info",
  tag,
  title,
  message,
  actionLabel = "Dismiss",
}: NoticeModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card text-card-foreground shadow-2xl duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            toneBorder[tone],
          )}
        >
          <div className="flex items-center justify-between px-5 pt-[18px]">
            <div className="flex items-center gap-[9px] text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              <span className={cn("h-2 w-2 shrink-0 animate-pulse rounded-full", toneDot[tone])} />
              <span>{tag ?? toneLabel[tone]}</span>
            </div>
            <DialogPrimitive.Close className="flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          <div className="px-5 pb-5 pt-3.5">
            <DialogPrimitive.Title className="mb-2 text-[15px] font-semibold uppercase tracking-[0.02em]">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-[13.5px] text-muted-foreground">
              {message}
            </DialogPrimitive.Description>
          </div>

          <div className="flex gap-2.5 px-5 pb-5">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {actionLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
