import { useTranslation } from "react-i18next"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LeaveBalanceSummary } from "@/lib/api"

// A single leave-type balance card: shows the remaining days prominently with a
// usage progress bar and a compact entitlement/used/carried breakdown.
export function LeaveBalanceCard({
  balance,
  className,
}: {
  balance: LeaveBalanceSummary
  className?: string
}) {
  const { t } = useTranslation()
  const color = balance.leaveTypeColor || "#6366f1"

  const total = balance.entitlement + balance.carriedForward
  const used = balance.used
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0

  return (
    <Card className={cn("gap-4 rounded-none p-5", className)}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span
            className="inline-block size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          {balance.leaveTypeName}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          {t("leaveBalanceCard.remainingBadge", { count: balance.remaining })}
        </span>
      </div>

      <div className="flex items-end gap-1.5">
        <span className="text-3xl font-semibold leading-none">{balance.remaining}</span>
        <span className="pb-0.5 text-xs text-muted-foreground">
          {t("leaveBalanceCard.ofTotal", { total })}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label={t("leaveBalanceCard.entitled")} value={balance.entitlement} />
        <Stat label={t("leaveBalanceCard.used")} value={used} />
        <Stat label={t("leaveBalanceCard.carried")} value={balance.carriedForward} />
      </div>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  )
}
