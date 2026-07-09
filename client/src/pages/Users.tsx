import { useNavigate } from "react-router-dom"
import { useMemo } from "react"
import { LogIn, Pencil, Plus, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { startCase } from "lodash-es"

import { Page } from "@/components/Page"
import { AppButton } from "@/components/AppButton"
import { ActionButton } from "@/components/ActionButton"
import { StatusPill } from "@/components/StatusPill"
import { BadgeList } from "@/components/BadgeList"
import { DataTable } from "@/components/datatable/DataTable"
import { column } from "@/components/datatable/column"
import { useResource } from "@/lib/query"
import { type ManagedUser } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { formatDate } from "@/lib/format"

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
  function renderStatus(value: unknown) {
    return (
      <StatusPill
        active={Boolean(value)}
        activeLabel={t("users.active")}
        inactiveLabel={t("users.inactive")}
      />
    )
  }

  function renderName(_: unknown, row: ManagedUser) {
    return (
      <span className="font-medium">
        {row.firstName} {row.lastName}
      </span>
    )
  }

  function renderRoles(_: unknown, row: ManagedUser) {
    const names = row.roleIds
      .map((rid) => options.rolesById.get(rid))
      .filter((n): n is string => Boolean(n))
      .map(startCase)
    return (
      <BadgeList
        items={names}
        empty={<span className="text-muted-foreground">{t("common.dash")}</span>}
      />
    )
  }

  function renderActions(_: unknown, row: ManagedUser) {
    return (
      <div className="flex items-center justify-end">
        {options.canImpersonate && row.id !== options.currentUserId && (
          <ActionButton
            tone="primary"
            icon={LogIn}
            onClick={() => options.onImpersonate(row)}
          >
            {t("users.impersonate")}
          </ActionButton>
        )}
        <ActionButton to={`/users/${row.id}/edit`} icon={Pencil}>
          {t("users.edit")}
        </ActionButton>
      </div>
    )
  }

  return [
    column<ManagedUser>("isActive", t("users.columns.status"))
      .sortOn("status")
      .render(renderStatus),
    column<ManagedUser>("name", t("users.columns.name"))
      .sortOn("name")
      .render(renderName),
    column<ManagedUser>("email", t("users.columns.email")).muted(),
    column<ManagedUser>("organizationName", t("users.columns.organization"))
      .when(options.showOrganization)
      .unsortable()
      .muted()
      .format((value) => (value as string | null) ?? "—"),
    column<ManagedUser>("roleIds", t("users.columns.roles"))
      .when(options.showRoles)
      .unsortable()
      .render(renderRoles),
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
      .render(renderActions),
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
        <AppButton icon={Plus} onClick={() => navigate("/users/new")}>
          {t("users.newUser")}
        </AppButton>
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
