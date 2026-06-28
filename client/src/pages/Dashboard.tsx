import { LayoutDashboard, UserCheck, UserPlus, Users, UserX } from "lucide-react"

import { Page } from "@/components/Page"
import { Card } from "@/components/ui/card"
import { useResource } from "@/lib/query"
import { type DashboardStats } from "@/lib/api"
import { cn } from "@/lib/utils"

const cards = [
  { key: "totalUsers", label: "Total Users", icon: Users, accent: "text-foreground" },
  { key: "activeUsers", label: "Active Users", icon: UserCheck, accent: "text-emerald-500" },
  { key: "inactiveUsers", label: "Inactive Users", icon: UserX, accent: "text-rose-500" },
  { key: "newThisMonth", label: "New This Month", icon: UserPlus, accent: "text-sky-500" },
] as const

export default function DashboardPage() {
  // Errors (including 401 -> redirect) are handled globally by the axios
  // interceptor, so the page only deals with the happy path.
  const { data, isLoading } = useResource<DashboardStats>("dashboard/stats")
  const loading = isLoading || !data

  return (
    <Page
      title="Dashboard"
      icon={LayoutDashboard}
      description="An overview of your user base."
      loading={loading}
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ key, label, icon: Icon, accent }) => (
          <Card key={key} className="gap-0 rounded-none p-8">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-muted-foreground">
                {label}
              </span>
              <Icon className={cn("size-7", accent)} />
            </div>
            <span className="mt-6 text-5xl font-semibold tabular-nums">
              {data?.[key]}
            </span>
          </Card>
        ))}
      </div>
    </Page>
  )
}
