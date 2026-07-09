import type { ComponentType } from "react"

import { useCountUp } from "@/lib/useCountUp"

// A single dashboard metric: an icon on the left, and an animated count with a
// label + description on the right. The count animates up whenever it changes.
interface StatCardProps {
  icon: ComponentType<{ className?: string }>
  value: number
  label: string
  description: string
}

export function StatCard({ icon: Icon, value, label, description }: StatCardProps) {
  const count = useCountUp(value)
  return (
    <div className="flex items-center gap-4 rounded-none border bg-background p-5">
      <Icon className="size-9 shrink-0 text-muted-foreground" />
      <div className="flex flex-1 flex-col text-right">
        <span className="text-3xl font-bold leading-none tabular-nums">{count}</span>
        <span className="mt-1.5 text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
    </div>
  )
}
