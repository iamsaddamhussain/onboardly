import { useEffect, useRef, useState } from "react"
import { Building2, Building, LayoutDashboard, UserCheck, UserPlus, Users, UserX } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { useResource } from "@/lib/query"
import { type DashboardStats } from "@/lib/api"

const cards = [
  { key: "totalUsers", icon: Users },
  { key: "activeUsers", icon: UserCheck },
  { key: "inactiveUsers", icon: UserX },
  { key: "newThisMonth", icon: UserPlus },
] as const

// Platform-only tenant cards, shown on the "all organizations" view.
const orgCards = [
  { key: "totalOrganizations", icon: Building2 },
  { key: "activeOrganizations", icon: Building },
  { key: "inactiveOrganizations", icon: Building },
] as const

// Animate from 0 up to the target whenever the target changes.
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  const frame = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // Ease-out so it slows near the end.
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [target, duration])

  return value
}

function StatValue({ value }: { value: number }) {
  const count = useCountUp(value)
  return <span className="text-3xl font-bold leading-none tabular-nums">{count}</span>
}

export default function DashboardPage() {
  const { t } = useTranslation()
  // Errors (including 401 -> redirect) are handled globally by the axios
  // interceptor, so the page only deals with the happy path.
  const { data, isLoading } = useResource<DashboardStats>("dashboard/stats")
  const loading = isLoading || !data

  return (
    <Page
      title={t("dashboard.title")}
      icon={LayoutDashboard}
      description={t("dashboard.description")}
      loading={loading}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ key, icon: Icon }) => (
          <div
            key={key}
            className="flex items-center gap-4 rounded-none border bg-background p-5"
          >
            <Icon className="size-9 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 flex-col text-right">
              <StatValue value={data?.[key] ?? 0} />
              <span className="mt-1.5 text-sm font-semibold">{t(`dashboard.${key}`)}</span>
              <span className="text-xs text-muted-foreground">{t(`dashboard.${key}Desc`)}</span>
            </div>
          </div>
        ))}
      </div>

      {data?.totalOrganizations != null && (
        <div className="mt-8 flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t("dashboard.organizationsSection")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgCards.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="flex items-center gap-4 rounded-none border bg-background p-5"
              >
                <Icon className="size-9 shrink-0 text-muted-foreground" />
                <div className="flex flex-1 flex-col text-right">
                  <StatValue value={data?.[key] ?? 0} />
                  <span className="mt-1.5 text-sm font-semibold">{t(`dashboard.${key}`)}</span>
                  <span className="text-xs text-muted-foreground">{t(`dashboard.${key}Desc`)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Page>
  )
}
