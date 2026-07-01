import { Link, useNavigate } from "react-router-dom"
import { Pencil, Plus, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Page } from "@/components/Page"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/datatable/DataTable"
import { column } from "@/components/datatable/column"
import { type ManagedUser } from "@/lib/api"
import { cn } from "@/lib/utils"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function buildColumns(t: TFunction) {
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
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-none"
        >
          <Link to={`/users/${row.id}/edit`}>
            <Pencil /> {t("users.edit")}
          </Link>
        </Button>
      )),
  ]
}

export default function UsersPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const columns = buildColumns(t)

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
