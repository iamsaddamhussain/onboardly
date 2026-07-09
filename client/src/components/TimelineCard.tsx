import { Card } from "@/components/ui/card"
import { Timeline } from "@/components/Timeline"
import { cn } from "@/lib/utils"
import type { AuditLogEntry } from "@/lib/api"

// A titled card wrapping the activity Timeline. Single responsibility — the
// "recent activity" panel shared by the organization and user profiles, so the
// card chrome and heading live in one place.
interface TimelineCardProps {
  title: string
  entries: AuditLogEntry[]
  emptyLabel: string
  className?: string
}

export function TimelineCard({ title, entries, emptyLabel, className }: TimelineCardProps) {
  return (
    <Card className={cn("gap-4 rounded-none p-6", className)}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <Timeline entries={entries} emptyLabel={emptyLabel} />
    </Card>
  )
}
