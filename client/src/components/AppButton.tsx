import type { ComponentProps, ComponentType, ReactNode } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The standard app button. Wraps the base Button with the square (rounded-none)
// styling used across the app and a built-in loading state: when `loading` is
// set the button is disabled and shows a spinner (optionally swapping the label
// for `loadingText`), matching the submit/save buttons throughout the forms.
interface AppButtonProps extends ComponentProps<typeof Button> {
  /** Disable + show a spinner while an async action is in flight. */
  loading?: boolean
  /** Optional label shown in place of children while loading (e.g. "Saving…"). */
  loadingText?: ReactNode
  /** Optional leading icon (lucide component). */
  icon?: ComponentType<{ className?: string }>
}

export function AppButton({
  loading = false,
  loadingText,
  icon: Icon,
  asChild = false,
  disabled,
  className,
  children,
  ...props
}: AppButtonProps) {
  // asChild renders a single child (e.g. a Link) via Slot, so don't inject the
  // icon/spinner decorations that would give Slot multiple children.
  if (asChild) {
    return (
      <Button asChild className={cn("rounded-none", className)} disabled={disabled} {...props}>
        {children}
      </Button>
    )
  }

  return (
    <Button
      className={cn("rounded-none", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" /> : Icon ? <Icon /> : null}
      {loading && loadingText ? loadingText : children}
    </Button>
  )
}
