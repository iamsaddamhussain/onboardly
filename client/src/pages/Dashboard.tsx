import { useEffect, useRef, useState } from "react"
import { LayoutDashboard, UserCheck, UserPlus, Users, UserX } from "lucide-react"

import { Page } from "@/components/Page"
import { useResource } from "@/lib/query"
import { type DashboardStats } from "@/lib/api"

const cards = [
  { key: "totalUsers", label: "Total Users", icon: Users, desc: "Everyone in your workspace" },
  { key: "activeUsers", label: "Active Users", icon: UserCheck, desc: "Able to sign in right now" },
  { key: "inactiveUsers", label: "Inactive Users", icon: UserX, desc: "Suspended or disabled" },
  { key: "newThisMonth", label: "New This Month", icon: UserPlus, desc: "Joined in the last 30 days" },
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ key, label, icon: Icon, desc }) => (
          <div
            key={key}
            className="flex items-center gap-4 rounded-none border bg-background p-5"
          >
            <Icon className="size-9 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 flex-col text-right">
              <StatValue value={data?.[key] ?? 0} />
              <span className="mt-1.5 text-sm font-semibold">{label}</span>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </div>
          </div>
        ))}
      </div>
    </Page>
  )
}
