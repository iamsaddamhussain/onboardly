import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import type { EmploymentStatus } from "@/lib/api"

// Colour treatment per employment status, reused by the list and profile.
const STATUS_TONE: Record<EmploymentStatus, string> = {
  Active: "text-emerald-500 before:bg-emerald-500",
  Probation: "text-amber-500 before:bg-amber-500",
  OnLeave: "text-sky-500 before:bg-sky-500",
  Suspended: "text-orange-500 before:bg-orange-500",
  Terminated: "text-muted-foreground before:bg-muted-foreground/50",
}

// A small dot + translated label for an employment status.
export function EmploymentStatusPill({ status }: { status: EmploymentStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        "before:size-2 before:content-['']",
        STATUS_TONE[status] ?? "text-muted-foreground before:bg-muted-foreground/50",
      )}
    >
      {t(`employment.status.${status}`)}
    </span>
  )
}
