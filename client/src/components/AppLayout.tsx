import { useEffect, useState } from "react"
import { LayoutDashboard, ListTodo, Menu, ShieldCheck, Users, X } from "lucide-react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { ProfileMenu } from "@/components/ProfileMenu"
import { useAuthStore } from "@/store/auth-store"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, permission: null },
  { to: "/users", labelKey: "nav.users", icon: Users, permission: "manage_users" },
  { to: "/roles", labelKey: "nav.roles", icon: ShieldCheck, permission: "manage_roles" },
]

export function AppLayout() {
  const { t } = useTranslation()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const visibleNav = navItems.filter(
    (item) => item.permission == null || hasPermission(item.permission),
  )

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setOpen(false), [location.pathname])

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Backdrop for the mobile drawer. */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-background transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-3 border-b px-5">
          <div className="flex size-9 items-center justify-center rounded-none bg-primary text-primary-foreground">
            <ListTodo className="size-5" />
          </div>
          <span className="text-lg font-semibold">{t("common.appName")}</span>
          <button
            type="button"
            className="ml-auto md:hidden"
            onClick={() => setOpen(false)}
            aria-label={t("nav.closeMenu")}
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-2 p-4">
          {visibleNav.map(({ to, labelKey, icon: Icon }) => (
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
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:justify-end md:px-6">
          <button
            type="button"
            className="md:hidden"
            onClick={() => setOpen(true)}
            aria-label={t("nav.openMenu")}
          >
            <Menu className="size-5" />
          </button>
          <ProfileMenu />
        </header>

        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-[1600px] min-w-0 px-4 py-6 sm:px-6 md:px-10 md:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
