import { LayoutDashboard, ListTodo, ShieldCheck, Users } from "lucide-react"
import { NavLink, Outlet } from "react-router-dom"

import { ProfileMenu } from "@/components/ProfileMenu"
import { useAuthStore } from "@/store/auth-store"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: null },
  { to: "/users", label: "Users", icon: Users, permission: "manage_users" },
  { to: "/roles", label: "Roles & Permissions", icon: ShieldCheck, permission: "manage_roles" },
]

export function AppLayout() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const visibleNav = navItems.filter(
    (item) => item.permission == null || hasPermission(item.permission),
  )

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="flex w-72 flex-col border-r bg-background">
        <div className="flex h-14 items-center gap-3 border-b px-5">
          <div className="flex size-9 items-center justify-center rounded-none bg-primary text-primary-foreground">
            <ListTodo className="size-5" />
          </div>
          <span className="text-lg font-semibold">Onboardly</span>
        </div>

        <nav className="flex flex-1 flex-col gap-2 p-4">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-none px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end border-b bg-background px-6">
          <ProfileMenu />
        </header>

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1600px] px-10 py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
