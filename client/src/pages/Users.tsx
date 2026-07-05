import { Link, useNavigate } from "react-router-dom"
import { useMemo } from "react"
import { LogIn, Pencil, Plus, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Page } from "@/components/Page"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/datatable/DataTable"
import { column } from "@/components/datatable/column"
import { useResource } from "@/lib/query"
import { type ManagedUser } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { cn } from "@/lib/utils"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function roleLabel(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function buildColumns(
  t: TFunction,
  options: {
    canImpersonate: boolean
    showRoles: boolean
    showOrganization: boolean
    rolesById: Map<number, string>
    currentUserId?: number
    onImpersonate: (row: ManagedUser) => void
  },
) {
  return [
    column<ManagedUser>("isActive", t("users.columns.status"))
      .sortOn("status")
      .render((value) => (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium",
            value ? "text-emerald-500" : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "size-2",
              value ? "bg-emerald-500" : "bg-muted-foreground/50",
            )}
          />
          {value ? t("users.active") : t("users.inactive")}
        </span>
      )),
    column<ManagedUser>("name", t("users.columns.name"))
      .sortOn("name")
      .render((_, row) => (
        <span className="font-medium">
          {row.firstName} {row.lastName}
        </span>
      )),
    column<ManagedUser>("email", t("users.columns.email")).muted(),
    ...(options.showOrganization
      ? [
          column<ManagedUser>("organizationName", t("users.columns.organization"))
            .unsortable()
            .muted()
            .format((value) => (value as string | null) ?? "—"),
        ]
      : []),
    ...(options.showRoles
      ? [
          column<ManagedUser>("roleIds", t("users.columns.roles"))
            .unsortable()
            .render((_, row) => {
              const names = row.roleIds
                .map((rid) => options.rolesById.get(rid))
                .filter((n): n is string => Boolean(n))
              if (names.length === 0)
                return <span className="text-muted-foreground">{t("common.dash")}</span>
              return (
                <div className="flex flex-wrap gap-1">
                  {names.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center rounded-none bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    >
                      {roleLabel(name)}
                    </span>
                  ))}
                </div>
              )
            }),
        ]
      : []),
    column<ManagedUser>("city", t("users.columns.city"))
      .muted()
      .format((value) => (value as string | null) ?? "—"),
    column<ManagedUser>("jobTitle", t("users.columns.jobTitle"))
      .muted()
      .format((value) => (value as string | null) ?? "—"),
    column<ManagedUser>("language", t("users.columns.language"))
      .unsortable()
      .muted()
      .format((value) => t(`languages.${value as string}`)),
    column<ManagedUser>("createdAt", t("users.columns.joined"))
      .sortOn("joined")
      .muted()
      .format((value) => formatDate(value as string)),
    column<ManagedUser>("updatedAt", t("users.columns.updated"))
      .sortOn("updated")
      .muted()
      .format((value) => (value ? formatDate(value as string) : "—")),
    column<ManagedUser>("mobile", t("users.columns.mobile"))
      .sortOn("mobile")
      .muted()
      .format((value) => (value as string | null) ?? "—"),
    column<ManagedUser>("id", t("users.columns.actions"))
      .unsortable()
      .right()
      .render((_, row) => (
        <div className="flex items-center justify-end">
          {options.canImpersonate && row.id !== options.currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer rounded-none text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => options.onImpersonate(row)}
            >
              <LogIn /> {t("users.impersonate")}
            </Button>
          )}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="cursor-pointer rounded-none"
          >
            <Link to={`/users/${row.id}/edit`}>
              <Pencil /> {t("users.edit")}
            </Link>
          </Button>
        </div>
      )),
  ]
}

export default function UsersPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const currentUser = useAuthStore((s) => s.user)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const impersonate = useAuthStore((s) => s.impersonate)
  const canManageRoles = hasPermission("manage_roles")
  const canAssignOrg = hasPermission("platform.switch_organization")

  // Role names for the badges column; only fetchable with manage_roles.
  const { data: rolesData } = useResource<{ roles: { id: number; name: string }[] }>(
    "roles",
    {},
    { enabled: canManageRoles },
  )
  const rolesById = useMemo(() => {
    const map = new Map<number, string>()
    rolesData?.roles.forEach((r) => map.set(r.id, r.name))
    return map
  }, [rolesData])

  async function handleImpersonate(row: ManagedUser) {
    await impersonate(row.id)
    navigate("/dashboard", { replace: true })
  }

  const columns = buildColumns(t, {
    canImpersonate: hasPermission("impersonate_users"),
    showRoles: canManageRoles,
    showOrganization: canAssignOrg,
    rolesById,
    currentUserId: currentUser?.id,
    onImpersonate: handleImpersonate,
  })

  return (
    <Page
      title={t("users.title")}
      icon={Users}
      description={t("users.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.users") },
      ]}
      actions={
        <Button className="rounded-none" onClick={() => navigate("/users/new")}>
          <Plus /> {t("users.newUser")}
        </Button>
      }
    >
      <DataTable<ManagedUser>
        url="users"
        columns={columns}
        rowKey="id"
        defaults={{ sortBy: "joined", sortDir: "desc", pageSize: 10 }}
        pageSizeOptions={[10, 25, 50, 100]}
        searchPlaceholder={t("users.search")}
        emptyMessage={t("users.empty")}
        emptyIcon={Users}
        countNoun={t("users.noun")}
        stickyHeader
        fullPageLoading
      />
    </Page>
  )
}
