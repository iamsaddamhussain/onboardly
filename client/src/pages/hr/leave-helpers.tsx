import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import type { LeaveStatus } from "@/lib/api"

// Colour mapping for leave request statuses, mirroring the attendance helpers.
const statusStyles: Record<LeaveStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  Submitted: "bg-blue-100 text-blue-700",
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700",
  Cancelled: "bg-zinc-200 text-zinc-600",
  Withdrawn: "bg-zinc-200 text-zinc-600",
}

export function LeaveStatusPill({ status }: { status: LeaveStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium",
        statusStyles[status],
      )}
    >
      {t(`leaveStatus.${status}`)}
    </span>
  )
}

// Short human label for a day range with half-day portions, e.g. "Full" or
// "First half". Used in request rows.
export function portionLabel(t: (k: string) => string, portion: string) {
  return t(`dayPortion.${portion}`)
}
