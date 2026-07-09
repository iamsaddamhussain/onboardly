import type { ComponentType } from "react"
import { useTranslation } from "react-i18next"

import { StatCard } from "@/components/dashboard/StatCard"
import { cn } from "@/lib/utils"

// Config for one stat card. `key` doubles as the i18n key (`dashboard.<key>` /
// `dashboard.<key>Desc`) and the field to read from the stats payload.
export interface StatItem<K extends string = string> {
  key: K
  icon: ComponentType<{ className?: string }>
}

interface StatGridProps<K extends string> {
  items: readonly StatItem<K>[]
  values: Partial<Record<K, number | null>>
  /** Extra classes to control the responsive column count. */
  className?: string
}

// Renders a responsive grid of StatCards from a config array + a stats payload.
export function StatGrid<K extends string>({ items, values, className }: StatGridProps<K>) {
  const { t } = useTranslation()
  return (
    <div className={cn("grid grid-cols-1 gap-4", className)}>
      {items.map(({ key, icon }) => (
        <StatCard
          key={key}
          icon={icon}
          value={values[key] ?? 0}
          label={t(`dashboard.${key}`)}
          description={t(`dashboard.${key}Desc`)}
        />
      ))}
    </div>
  )
}
