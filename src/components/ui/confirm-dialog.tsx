"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ConfirmTone = "neutral" | "destructive";

const toneDot: Record<ConfirmTone, string> = {
  neutral: "bg-primary",
  destructive: "bg-destructive",
};

const toneBorder: Record<ConfirmTone, string> = {
  neutral: "",
  destructive: "border-destructive/35",
};

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tone?: ConfirmTone;
  tag?: string;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  tone = "neutral",
  tag,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[400px] max-h-[calc(100dvh-2rem)] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card text-card-foreground shadow-2xl duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            toneBorder[tone],
          )}
        >
          <div className="flex items-center gap-[9px] px-5 pt-[18px] text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", toneDot[tone])} />
            <span>{tag ?? (tone === "destructive" ? "Confirm removal" : "Confirm")}</span>
          </div>

          <div className="px-5 pb-5 pt-3.5">
            <AlertDialogPrimitive.Title className="mb-2 text-[15px] font-semibold uppercase tracking-[0.02em]">
              {title}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-[13.5px] text-muted-foreground">
              {message}
            </AlertDialogPrimitive.Description>
          </div>

          <div className="flex gap-2.5 px-5 pb-5">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline" className="flex-1">
                {cancelLabel}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              <Button
                variant={tone === "destructive" ? "destructive" : "default"}
                className="flex-1"
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
