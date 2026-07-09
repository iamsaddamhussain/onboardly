import { useEffect, useState } from "react"
import { Building2, History, LayoutDashboard, ListTodo, Menu, ShieldCheck, Users, X } from "lucide-react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { ProfileMenu } from "@/components/ProfileMenu"
import { OrgSwitcher } from "@/components/OrgSwitcher"
import { ImpersonationBanner } from "@/components/ImpersonationBanner"
import { Avatar } from "@/components/Avatar"
import { useAuthStore } from "@/store/auth-store"
import { cn } from "@/lib/utils"

type NavItem = {
  to: string
  labelKey: string
  icon: typeof LayoutDashboard
  permission: string | string[] | null
  // Only show when acting within a tenant (org user, or global user switched in).
  requiresOrgContext?: boolean
}

const navGroups: { labelKey: string | null; items: NavItem[] }[] = [
  {
    labelKey: null,
    items: [
      { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, permission: null },
      { to: "/organization", labelKey: "nav.organization", icon: Building2, permission: ["manage_users", "manage_roles", "platform.manage_organizations"], requiresOrgContext: true },
    ],
  },
  {
    labelKey: "nav.adminArea",
    items: [
      { to: "/organizations", labelKey: "nav.organizations", icon: Building2, permission: "platform.manage_organizations" },
      { to: "/users", labelKey: "nav.users", icon: Users, permission: "manage_users" },
      { to: "/roles", labelKey: "nav.roles", icon: ShieldCheck, permission: "manage_roles" },
      { to: "/audit", labelKey: "nav.audit", icon: History, permission: ["view_audit", "platform.view_all_audits"] },
    ],
  },
]

export function AppLayout() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const inTenantContext = user?.scope === "org" || user?.activeOrganizationId != null
  const canSee = (item: NavItem) => {
    if (item.requiresOrgContext && !inTenantContext) return false
    if (item.permission == null) return true
    const required = Array.isArray(item.permission) ? item.permission : [item.permission]
    return required.some((p) => hasPermission(p))
  }
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter(canSee) }))
    .filter((group) => group.items.length > 0)

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
          <Avatar icon={ListTodo} className="size-9" />
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

        <nav className="flex flex-1 flex-col gap-6 p-4">
          {visibleGroups.map((group, index) => (
            <div key={group.labelKey ?? index} className="flex flex-col gap-2">
              {group.labelKey && (
                <span className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {t(group.labelKey)}
                </span>
              )}
              {group.items.map(({ to, labelKey, icon: Icon }) => (
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
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden"
              onClick={() => setOpen(true)}
              aria-label={t("nav.openMenu")}
            >
              <Menu className="size-5" />
            </button>
            <OrgSwitcher />
          </div>
          <ProfileMenu />
        </header>

        <ImpersonationBanner />

        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-[1600px] min-w-0 px-4 py-6 sm:px-6 md:px-10 md:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
