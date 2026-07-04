import { cn } from "@/lib/utils"
import type { AuditLogEntry } from "@/lib/api"

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function actionTone(action: string) {
  const a = action.toLowerCase()
  if (a.startsWith("create")) return "text-emerald-500"
  if (a.startsWith("delete")) return "text-destructive"
  if (a.startsWith("impersonate")) return "text-amber-500"
  return "text-foreground"
}

function dotTone(action: string) {
  const a = action.toLowerCase()
  if (a.startsWith("create")) return "bg-emerald-500"
  if (a.startsWith("delete")) return "bg-destructive"
  if (a.startsWith("impersonate")) return "bg-amber-500"
  return "bg-primary"
}

// Vertical activity timeline rendered from audit entries. Used by both the
// organization (company) profile and the individual user profile.
export function Timeline({
  entries,
  emptyLabel,
}: {
  entries: AuditLogEntry[]
  emptyLabel: string
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => (
        <li key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", dotTone(entry.action))} />
            {index < entries.length - 1 && <span className="w-px flex-1 bg-border" />}
          </div>
          <div className="pb-5">
            <p className="text-sm">
              <span className={cn("font-semibold uppercase tracking-wide", actionTone(entry.action))}>
                {entry.action}
              </span>{" "}
              <span className="text-muted-foreground">
                {entry.entityType} #{entry.entityId}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">{formatDateTime(entry.timestamp)}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
