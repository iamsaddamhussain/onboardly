import { History } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Page } from "@/components/Page"
import { DataTable } from "@/components/datatable/DataTable"
import { column } from "@/components/datatable/column"
import { type AuditLogEntry } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { cn } from "@/lib/utils"

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function actionTone(action: string) {
  const a = action.toLowerCase()
  if (a.startsWith("create")) return "text-emerald-500"
  if (a.startsWith("delete")) return "text-destructive"
  if (a.startsWith("impersonate")) return "text-amber-500"
  return "text-foreground"
}

function buildColumns(t: TFunction, showOrganization: boolean) {
  return [
    column<AuditLogEntry>("timestamp", t("audit.columns.timestamp"))
      .sortOn("timestamp")
      .muted()
      .format((value) => formatDateTime(value as string)),
    column<AuditLogEntry>("action", t("audit.columns.action"))
      .sortOn("action")
      .render((value) => (
        <span className={cn("text-xs font-semibold uppercase tracking-wide", actionTone(value as string))}>
          {value as string}
        </span>
      )),
    column<AuditLogEntry>("entityType", t("audit.columns.entity"))
      .sortOn("entityType")
      .render((_, row) => (
        <span>
          <span className="font-medium">{row.entityType}</span>
          <span className="text-muted-foreground"> #{row.entityId}</span>
        </span>
      )),
    column<AuditLogEntry>("userId", t("audit.columns.user"))
      .unsortable()
      .muted()
      .format((value) => (value == null ? t("audit.system") : `#${value}`)),
    ...(showOrganization
      ? [
          column<AuditLogEntry>("organizationId", t("audit.columns.organization"))
            .unsortable()
            .muted()
            .format((value) => (value == null ? t("audit.platform") : `#${value}`)),
        ]
      : []),
    column<AuditLogEntry>("ipAddress", t("audit.columns.ip"))
      .unsortable()
      .muted()
      .format((value) => (value as string | null) ?? t("common.dash")),
  ]
}

export default function AuditLogPage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  // The org column only adds value on the platform-wide view (all tenants);
  // once scoped to a single organization every row shares the same org.
  const showOrganization = user?.scope === "global" && user?.activeOrganizationId == null

  const columns = buildColumns(t, showOrganization)

  return (
    <Page
      title={t("audit.title")}
      icon={History}
      description={t("audit.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.audit") },
      ]}
    >
      <DataTable<AuditLogEntry>
        url="audit"
        columns={columns}
        rowKey="id"
        defaults={{ sortBy: "timestamp", sortDir: "desc", pageSize: 25 }}
        pageSizeOptions={[25, 50, 100]}
        searchPlaceholder={t("audit.search")}
        emptyMessage={t("audit.empty")}
        emptyIcon={History}
        countNoun={t("audit.noun")}
        stickyHeader
        fullPageLoading
      />
    </Page>
  )
}
