import { useEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"

import { AppButton } from "@/components/AppButton"

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Style the confirm button as a destructive action. */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Lightweight, reusable confirmation modal. No extra dependencies — a fixed
// overlay plus a card. Closes on overlay click or the Escape key.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  // Portal to <body> so the fixed overlay covers the whole viewport even when
  // an ancestor has a transform/filter (which would otherwise clip it).
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md border bg-card p-6 text-card-foreground shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <AppButton variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </AppButton>
          <AppButton
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </AppButton>
        </div>
      </div>
    </div>,
    document.body,
  )
}
