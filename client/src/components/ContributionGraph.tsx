import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import dayjs from "dayjs"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ActivityHeatmapPoint } from "@/lib/api"

const DAY_MS = 86_400_000
const WEEKS = 53

// Tailwind classes for the five intensity buckets, mirroring GitHub's scale.
// Index 0 is the empty (no activity) cell.
const LEVEL_CLASS = [
  "bg-muted",
  "bg-emerald-200 dark:bg-emerald-900",
  "bg-emerald-300 dark:bg-emerald-700",
  "bg-emerald-500 dark:bg-emerald-600",
  "bg-emerald-600 dark:bg-emerald-400",
] as const

interface Cell {
  date: Date
  key: string
  // null for days beyond today (padding at the end of the current week).
  count: number | null
}

// Buckets a day's activity count into one of five intensity levels (0-4).
function level(count: number): number {
  if (count <= 0) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  if (count <= 9) return 3
  return 4
}

// Local YYYY-MM-DD key so it lines up with the server's DateOnly strings.
function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

// Builds a 53-week grid (columns) of 7 days (rows, Sun–Sat) ending this week,
// filling each day from the sparse activity points supplied by the server.
function buildWeeks(points: ActivityHeatmapPoint[]): Cell[][] {
  const counts = new Map(points.map((p) => [p.date, p.count]))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Grid starts on the Sunday that makes the current week the last column.
  const start = new Date(today.getTime() - ((WEEKS - 1) * 7 + today.getDay()) * DAY_MS)

  const weeks: Cell[][] = []
  for (let w = 0; w < WEEKS; w++) {
    const days: Cell[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * DAY_MS)
      const key = dateKey(date)
      days.push({
        date,
        key,
        count: date > today ? null : counts.get(key) ?? 0,
      })
    }
    weeks.push(days)
  }
  return weeks
}

// Month labels positioned above the first week-column of each new month.
function monthLabels(weeks: Cell[][]): { index: number; label: string }[] {
  const labels: { index: number; label: string }[] = []
  let lastMonth = -1
  weeks.forEach((week, index) => {
    const month = week[0].date.getMonth()
    if (month !== lastMonth) {
      labels.push({ index, label: dayjs(week[0].date).format("MMM") })
      lastMonth = month
    }
  })
  return labels
}

interface ContributionGraphProps {
  title: string
  points: ActivityHeatmapPoint[]
  className?: string
}

// A GitHub-style contribution heatmap card, sharing the "recent activity" role
// with TimelineCard. Renders roughly a year of daily activity as a grid.
export function ContributionGraph({ title, points, className }: ContributionGraphProps) {
  const { t, i18n } = useTranslation()
  const weeks = useMemo(() => buildWeeks(points), [points])
  const months = useMemo(() => monthLabels(weeks), [weeks])

  const total = points.reduce((sum, p) => sum + p.count, 0)
  // Weekday row labels (Mon/Wed/Fri) localised via dayjs.
  const weekdays = [1, 3, 5].map((d) => dayjs().locale(i18n.language).day(d).format("dd"))

  return (
    <Card className={cn("gap-4 rounded-none p-6", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {t("contributions.total", { count: total })}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1.5">
          {/* Month header row, aligned to the day columns below. */}
          <div className="flex pl-8">
            <div className="relative h-4 flex-1" style={{ minWidth: WEEKS * 14 }}>
              {months.map((m) => (
                <span
                  key={`${m.index}-${m.label}`}
                  className="absolute text-[10px] text-muted-foreground"
                  style={{ left: m.index * 14 }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-1.5">
            {/* Weekday labels down the left edge. */}
            <div className="flex w-6 flex-col justify-between pt-3.75 text-[10px] text-muted-foreground">
              {weekdays.map((d) => (
                <span key={d} className="h-2.75 leading-2.75">
                  {d}
                </span>
              ))}
            </div>

            {/* The week columns. */}
            <div className="flex gap-0.75">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-0.75">
                  {week.map((cell) => (
                    <div
                      key={cell.key}
                      title={
                        cell.count === null
                          ? undefined
                          : t("contributions.tooltip", {
                              count: cell.count,
                              date: dayjs(cell.date).format("ll"),
                            })
                      }
                      className={cn(
                        "size-2.75 rounded-[2px]",
                        cell.count === null ? "bg-transparent" : LEVEL_CLASS[level(cell.count)],
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend. */}
          <div className="flex items-center justify-end gap-1 pt-1 text-[10px] text-muted-foreground">
            <span>{t("contributions.less")}</span>
            {LEVEL_CLASS.map((c, i) => (
              <span key={i} className={cn("size-2.75 rounded-[2px]", c)} />
            ))}
            <span>{t("contributions.more")}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
