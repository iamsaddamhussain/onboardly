import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import type { AttendanceStatus, CorrectionStatus } from "@/lib/api"

// Colour treatment per attendance status.
const STATUS_TONE: Record<AttendanceStatus, string> = {
  Present: "text-emerald-500 before:bg-emerald-500",
  Absent: "text-red-500 before:bg-red-500",
  Late: "text-amber-500 before:bg-amber-500",
  HalfDay: "text-orange-500 before:bg-orange-500",
  Leave: "text-sky-500 before:bg-sky-500",
  Holiday: "text-violet-500 before:bg-violet-500",
  Weekend: "text-muted-foreground before:bg-muted-foreground/50",
  WorkFromHome: "text-teal-500 before:bg-teal-500",
  OnDuty: "text-indigo-500 before:bg-indigo-500",
  MissingPunch: "text-rose-500 before:bg-rose-500",
}

export function AttendanceStatusPill({ status }: { status: AttendanceStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        "before:size-2 before:content-['']",
        STATUS_TONE[status] ?? "text-muted-foreground before:bg-muted-foreground/50",
      )}
    >
      {t(`attendanceStatus.${status}`)}
    </span>
  )
}

const CORRECTION_TONE: Record<CorrectionStatus, string> = {
  Pending: "text-amber-500 before:bg-amber-500",
  Approved: "text-emerald-500 before:bg-emerald-500",
  Rejected: "text-red-500 before:bg-red-500",
}

export function CorrectionStatusPill({ status }: { status: CorrectionStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        "before:size-2 before:content-['']",
        CORRECTION_TONE[status] ?? "text-muted-foreground before:bg-muted-foreground/50",
      )}
    >
      {t(`correctionStatus.${status}`)}
    </span>
  )
}
