import { Building2, Building, LayoutDashboard, UserCheck, UserPlus, Users, UserX } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { StatGrid, type StatItem } from "@/components/dashboard/StatGrid"
import { useResource } from "@/lib/query"
import { type DashboardStats } from "@/lib/api"

const cards: readonly StatItem<keyof DashboardStats>[] = [
  { key: "totalUsers", icon: Users },
  { key: "activeUsers", icon: UserCheck },
  { key: "inactiveUsers", icon: UserX },
  { key: "newThisMonth", icon: UserPlus },
]

// Platform-only tenant cards, shown on the "all organizations" view.
const orgCards: readonly StatItem<keyof DashboardStats>[] = [
  { key: "totalOrganizations", icon: Building2 },
  { key: "activeOrganizations", icon: Building },
  { key: "inactiveOrganizations", icon: Building },
]

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
      <StatGrid items={cards} values={data ?? {}} className="sm:grid-cols-2 lg:grid-cols-4" />

      {data?.totalOrganizations != null && (
        <div className="mt-8 flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t("dashboard.organizationsSection")}
          </h2>
          <StatGrid items={orgCards} values={data} className="sm:grid-cols-2 lg:grid-cols-3" />
        </div>
      )}
    </Page>
  )
}

