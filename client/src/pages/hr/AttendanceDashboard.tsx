import { useMemo } from "react"
import {
  CalendarX,
  Clock4,
  Coffee,
  Home,
  LayoutDashboard,
  Plane,
  UserCheck,
  UsersRound,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { Card } from "@/components/ui/card"
import { StatCard } from "@/components/dashboard/StatCard"
import { useResource } from "@/lib/query"
import {
  type AttendanceDashboardStats,
  type AttendanceTrendPoint,
} from "@/lib/api"
import { formatDate } from "@/lib/format"

function TrendChart({ points }: { points: AttendanceTrendPoint[] }) {
  const { t } = useTranslation()
  const max = Math.max(1, ...points.map((p) => p.present + p.absent + p.late))

  if (points.length === 0)
    return <p className="text-sm text-muted-foreground">{t("attendanceDashboard.noTrend")}</p>

  return (
    <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ minHeight: 160 }}>
      {points.map((p) => {
        const scale = 140 / max
        return (
          <div
            key={p.date}
            className="flex min-w-2.5 flex-1 flex-col items-center justify-end gap-1"
            title={`${formatDate(p.date)} · ${t("attendanceDashboard.present")}: ${p.present}, ${t("attendanceDashboard.late")}: ${p.late}, ${t("attendanceDashboard.absent")}: ${p.absent}`}
          >
            <div className="flex w-full flex-col-reverse">
              <div className="w-full bg-emerald-500" style={{ height: p.present * scale }} />
              <div className="w-full bg-amber-500" style={{ height: p.late * scale }} />
              <div className="w-full bg-red-500" style={{ height: p.absent * scale }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AttendanceDashboardPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useResource<AttendanceDashboardStats>("attendance/dashboard")
  const { data: trend } = useResource<AttendanceTrendPoint[]>("attendance/trend")

  const cards = useMemo(
    () => [
      { key: "presentToday", icon: UserCheck },
      { key: "absentToday", icon: CalendarX },
      { key: "lateToday", icon: Clock4 },
      { key: "onLeaveToday", icon: Plane },
      { key: "workFromHomeToday", icon: Home },
      { key: "missingCheckOut", icon: Coffee },
      { key: "pendingCorrections", icon: UsersRound },
      { key: "totalEmployees", icon: UsersRound },
    ] as const,
    [],
  )

  return (
    <Page
      title={t("attendanceDashboard.title")}
      icon={LayoutDashboard}
      description={t("attendanceDashboard.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.humanResources") },
        { label: t("nav.attendanceDashboard") },
      ]}
      loading={isLoading || !data}
    >
      {data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ key, icon }) => (
              <StatCard
                key={key}
                icon={icon}
                value={data[key]}
                label={t(`attendanceDashboard.${key}`)}
                description={t(`attendanceDashboard.${key}Desc`)}
              />
            ))}
          </div>

          <Card className="gap-4 rounded-none p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("attendanceDashboard.trends")}</h2>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 bg-emerald-500" />
                  {t("attendanceDashboard.present")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 bg-amber-500" />
                  {t("attendanceDashboard.late")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 bg-red-500" />
                  {t("attendanceDashboard.absent")}
                </span>
              </div>
            </div>
            <TrendChart points={trend ?? []} />
          </Card>
        </div>
      )}
    </Page>
  )
}
