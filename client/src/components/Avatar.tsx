import type { ComponentType } from "react"

import { cn } from "@/lib/utils"

// A primary-coloured badge showing either an icon or short initials. Single
// responsibility — the "avatar chip" look shared by the profile header, the
// organization header and the profile menu trigger, so its styling lives in
// one place. Size and shape are controlled via `className`.
interface AvatarProps {
  /** Icon component (lucide) to render; takes precedence over `initials`. */
  icon?: ComponentType<{ className?: string }>
  /** Fallback text shown when no icon is provided. */
  initials?: string
  /** Size/shape/text utilities for the outer badge (defaults to size-10 square). */
  className?: string
  /** Size utilities for the icon. */
  iconClassName?: string
}

export function Avatar({ icon: Icon, initials, className, iconClassName }: AvatarProps) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center bg-primary font-semibold text-primary-foreground",
        className,
      )}
    >
      {Icon ? <Icon className={cn("size-5", iconClassName)} /> : (initials || "?")}
    </span>
  )
}
