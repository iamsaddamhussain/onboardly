import { cn } from "@/lib/utils"

// A small status indicator: a coloured dot followed by a label. Single
// responsibility — it only knows how to show "active vs. inactive" visually.
// Reused by tables and profile headers so the styling lives in one place.
interface StatusPillProps {
  active: boolean
  activeLabel: string
  inactiveLabel: string
  className?: string
}

export function StatusPill({
  active,
  activeLabel,
  inactiveLabel,
  className,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        active ? "text-emerald-500" : "text-muted-foreground",
        className,
      )}
    >
      <span
        className={cn("size-2", active ? "bg-emerald-500" : "bg-muted-foreground/50")}
      />
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}
