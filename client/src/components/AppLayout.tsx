import { useEffect, useState } from "react"
import { Building2, CalendarCheck, CalendarClock, ChevronDown, ClipboardCheck, History, LayoutDashboard, ListTodo, Menu, Network, ShieldCheck, UsersRound, Users, X, BriefcaseBusiness, GitBranch } from "lucide-react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import localforage from "localforage"

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
  // Hide the item when the user holds any of these roles (e.g. admin-only
  // accounts that aren't employees shouldn't see self-service attendance).
  hideForRoles?: string[]
  // Only show when the user is linked to an employee record (self-service).
  requiresEmployeeLink?: boolean
}

// localforage key for the persisted collapsed nav sections.
const NAV_COLLAPSED_KEY = "nav.collapsedGroups"

const navGroups: { labelKey: string | null; collapsible?: boolean; items: NavItem[] }[] = [
  {
    labelKey: null,
    items: [
      { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, permission: null },
      { to: "/my-attendance", labelKey: "nav.myAttendance", icon: CalendarClock, permission: null, requiresOrgContext: true, hideForRoles: ["super_admin", "platform_admin"] },
      { to: "/organization", labelKey: "nav.organization", icon: Building2, permission: ["manage_users", "manage_roles", "platform.manage_organizations"], requiresOrgContext: true },
    ],
  },
  {
    labelKey: "nav.humanResources",
    collapsible: true,
    items: [
      { to: "/employees", labelKey: "nav.employees", icon: UsersRound, permission: "employees.view", requiresOrgContext: true },
      { to: "/departments", labelKey: "nav.departments", icon: Network, permission: "departments.view", requiresOrgContext: true },
      { to: "/job-titles", labelKey: "nav.jobTitles", icon: BriefcaseBusiness, permission: "jobtitles.view", requiresOrgContext: true },
      { to: "/org-chart", labelKey: "nav.orgChart", icon: GitBranch, permission: "orgchart.view", requiresOrgContext: true },
    ],
  },
  {
    labelKey: "nav.attendance",
    collapsible: true,
    items: [
      { to: "/attendance-dashboard", labelKey: "nav.attendanceDashboard", icon: LayoutDashboard, permission: "attendance.view", requiresOrgContext: true },
      { to: "/attendance", labelKey: "nav.attendance", icon: CalendarCheck, permission: "attendance.view", requiresOrgContext: true },
      { to: "/attendance-corrections", labelKey: "nav.corrections", icon: ClipboardCheck, permission: ["attendance.approve", "attendance.view"], requiresOrgContext: true },
    ],
  },
  {
    labelKey: "nav.leave",
    collapsible: true,
    items: [
      { to: "/my-leave", labelKey: "nav.myLeave", icon: CalendarClock, permission: null, requiresOrgContext: true, requiresEmployeeLink: true, hideForRoles: ["super_admin", "platform_admin"] },
      { to: "/leave-requests", labelKey: "nav.leaveApprovals", icon: ClipboardCheck, permission: ["leave.approve", "leave.view"], requiresOrgContext: true },
      { to: "/leave-types", labelKey: "nav.leaveTypes", icon: CalendarCheck, permission: ["leave.manage_types", "leave.view"], requiresOrgContext: true },
      { to: "/leave-policies", labelKey: "nav.leavePolicies", icon: ClipboardCheck, permission: ["leave.manage_policies", "leave.view"], requiresOrgContext: true },
      { to: "/leave-balances", labelKey: "nav.leaveBalances", icon: LayoutDashboard, permission: "leave.manage_balances", requiresOrgContext: true },
      { to: "/holidays", labelKey: "nav.holidays", icon: CalendarCheck, permission: ["holidays.manage", "holidays.view", "leave.view"], requiresOrgContext: true },
    ],
  },
  {
    labelKey: "nav.adminArea",
    collapsible: true,
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
  const hasRole = useAuthStore((s) => s.hasRole)
  const [open, setOpen] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [collapseLoaded, setCollapseLoaded] = useState(false)
  const location = useLocation()

  const toggleGroup = (key: string) =>
    setCollapsedGroups((state) => ({ ...state, [key]: !state[key] }))

  const inTenantContext = user?.scope === "org" || user?.activeOrganizationId != null
  const canSee = (item: NavItem) => {
    if (item.requiresOrgContext && !inTenantContext) return false
    if (item.requiresEmployeeLink && !user?.canUseLeave) return false
    if (item.hideForRoles?.some((r) => hasRole(r))) return false
    if (item.permission == null) return true
    const required = Array.isArray(item.permission) ? item.permission : [item.permission]
    return required.some((p) => hasPermission(p))
  }
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter(canSee) }))
    .filter((group) => group.items.length > 0)

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setOpen(false), [location.pathname])

  // Restore persisted collapsed sections once on mount.
  useEffect(() => {
    let active = true
    localforage
      .getItem<Record<string, boolean>>(NAV_COLLAPSED_KEY)
      .then((stored) => {
        if (active && stored) setCollapsedGroups(stored)
      })
      .finally(() => {
        if (active) setCollapseLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  // Persist collapsed sections whenever they change (after the initial load).
  useEffect(() => {
    if (collapseLoaded) localforage.setItem(NAV_COLLAPSED_KEY, collapsedGroups)
  }, [collapsedGroups, collapseLoaded])

  // Auto-expand the group that owns the active route on navigation, without
  // locking it open — the user can still collapse it afterwards.
  useEffect(() => {
    const active = navGroups.find(
      (group) => group.labelKey && group.items.some((item) => location.pathname.startsWith(item.to)),
    )
    if (active?.labelKey) {
      setCollapsedGroups((state) =>
        state[active.labelKey!] ? { ...state, [active.labelKey!]: false } : state,
      )
    }
  }, [location.pathname])

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

        <nav className="flex flex-1 flex-col gap-2 p-4">
          {visibleGroups.map((group, index) => {
            const groupKey = group.labelKey ?? String(index)
            const collapsible = Boolean(group.collapsible && group.labelKey)
            const isCollapsed = collapsible && Boolean(collapsedGroups[groupKey])

            return (
              <div key={groupKey} className="flex flex-col gap-2">
                {group.labelKey && collapsible ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupKey)}
                    aria-expanded={!isCollapsed}
                    className="flex w-full cursor-pointer items-center justify-between rounded-none px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {t(group.labelKey)}
                    <ChevronDown
                      className={cn("size-4 transition-transform", isCollapsed && "-rotate-90")}
                    />
                  </button>
                ) : group.labelKey ? (
                  <span className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t(group.labelKey)}
                  </span>
                ) : null}

                {collapsible ? (
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
                      isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
                    )}
                  >
                    <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
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
                  </div>
                ) : (
                  group.items.map(({ to, labelKey, icon: Icon }) => (
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
                  ))
                )}
              </div>
            )
          })}
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
