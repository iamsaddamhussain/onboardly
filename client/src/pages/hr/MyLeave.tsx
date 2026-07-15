import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CalendarClock, Plus, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Page } from "@/components/Page"
import { AppButton } from "@/components/AppButton"
import { ActionButton } from "@/components/ActionButton"
import { LeaveBalanceCard } from "@/components/LeaveBalanceCard"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { DataTable } from "@/components/datatable/DataTable"
import { column } from "@/components/datatable/column"
import { useResource, useResourceMutation } from "@/lib/query"
import { api, type LeaveBalanceSummary, type LeaveRequestRow } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { LeaveStatusPill } from "@/pages/hr/leave-helpers"

function buildColumns(
  t: TFunction,
  onCancel: (row: LeaveRequestRow) => void,
) {
  return [
    column<LeaveRequestRow>("leaveTypeName", t("myLeave.columns.type"))
      .unsortable()
      .render((_, row) => (
        <span className="flex items-center gap-2 font-medium">
          <span
            className="inline-block size-3 shrink-0 rounded-full"
            style={{ backgroundColor: row.leaveTypeColor }}
          />
          {row.leaveTypeName}
        </span>
      )),
    column<LeaveRequestRow>("startDate", t("myLeave.columns.dates"))
      .sortOn("startDate")
      .render((_, row) => (
        <span className="text-xs">
          {formatDate(row.startDate)} – {formatDate(row.endDate)}
        </span>
      )),
    column<LeaveRequestRow>("totalDays", t("myLeave.columns.days"))
      .sortOn("totalDays")
      .format((value) => String(value)),
    column<LeaveRequestRow>("reason", t("myLeave.columns.reason")).unsortable().muted(),
    column<LeaveRequestRow>("status", t("myLeave.columns.status"))
      .sortOn("status")
      .render((_, row) => <LeaveStatusPill status={row.status} />),
    column<LeaveRequestRow>("id", t("common.actions"))
      .unsortable()
      .right()
      .render((_, row) =>
        row.status === "Pending" || row.status === "Approved" ? (
          <div className="flex items-center justify-end">
            <ActionButton icon={X} onClick={() => onCancel(row)}>
              {row.status === "Pending" ? t("myLeave.withdraw") : t("myLeave.cancel")}
            </ActionButton>
          </div>
        ) : null,
      ),
  ]
}


export default function MyLeavePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [target, setTarget] = useState<LeaveRequestRow | null>(null)

  const { data: balances } = useResource<LeaveBalanceSummary[]>("leave-balances/mine")

  const cancelMutation = useResourceMutation<void, number>(
    (id) => api.cancelLeave(id),
    ["leave-requests/mine", "leave-balances/mine"],
  )

  const columns = useMemo(() => buildColumns(t, (row) => setTarget(row)), [t])

  async function confirmCancel() {
    if (!target) return
    await cancelMutation.mutateAsync(target.id)
    setTarget(null)
  }

  return (
    <Page
      title={t("myLeave.title")}
      icon={CalendarClock}
      description={t("myLeave.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.leave") },
        { label: t("nav.myLeave") },
      ]}
      actions={
        <AppButton icon={Plus} onClick={() => navigate("/leave/apply")}>
          {t("myLeave.applyLeave")}
        </AppButton>
      }
    >
      {balances && balances.length > 0 ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {balances.map((b) => (
            <LeaveBalanceCard key={b.leaveTypeId} balance={b} />
          ))}
        </div>
      ) : (
        <div className="mb-4 border border-dashed p-4 text-sm text-muted-foreground">
          {t("myLeave.noBalances")}
        </div>
      )}

      <DataTable<LeaveRequestRow>
        url="leave-requests/mine"
        columns={columns}
        rowKey="id"
        searchable={false}
        defaults={{ sortBy: "createdAt", sortDir: "desc", pageSize: 10 }}
        pageSizeOptions={[10, 25, 50]}
        emptyMessage={t("myLeave.empty")}
        emptyIcon={CalendarClock}
        countNoun={t("myLeave.noun")}
        stickyHeader
      />

      <ConfirmDialog
        open={target != null}
        title={target?.status === "Pending" ? t("myLeave.withdrawTitle") : t("myLeave.cancelTitle")}
        description={target?.status === "Pending" ? t("myLeave.withdrawDescription") : t("myLeave.cancelDescription")}
        confirmLabel={target?.status === "Pending" ? t("myLeave.withdraw") : t("myLeave.cancel")}
        cancelLabel={t("common.cancel")}
        destructive
        onConfirm={confirmCancel}
        onCancel={() => setTarget(null)}
      />
    </Page>
  )
}
