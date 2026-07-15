import { useMemo, useState } from "react"
import { Check, ClipboardCheck, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Page } from "@/components/Page"
import { ActionButton } from "@/components/ActionButton"
import { FormSelect } from "@/components/FormSelect"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { DataTable } from "@/components/datatable/DataTable"
import { column } from "@/components/datatable/column"
import { useResourceMutation } from "@/lib/query"
import { api, LEAVE_STATUSES, type LeaveRequestRow } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { LeaveStatusPill } from "@/pages/hr/leave-helpers"
import { useAuthStore } from "@/store/auth-store"

type Action = "approve" | "reject" | "cancel"

function buildColumns(
  t: TFunction,
  canApprove: boolean,
  onAction: (row: LeaveRequestRow, action: Action) => void,
) {
  return [
    column<LeaveRequestRow>("employeeName", t("leaveRequests.columns.employee"))
      .unsortable()
      .render((_, row) => <span className="font-medium">{row.employeeName}</span>),
    column<LeaveRequestRow>("leaveTypeName", t("leaveRequests.columns.type"))
      .unsortable()
      .render((_, row) => (
        <span className="flex items-center gap-2">
          <span
            className="inline-block size-3 shrink-0 rounded-full"
            style={{ backgroundColor: row.leaveTypeColor }}
          />
          {row.leaveTypeName}
        </span>
      )),
    column<LeaveRequestRow>("startDate", t("leaveRequests.columns.dates"))
      .sortOn("startDate")
      .render((_, row) => (
        <span className="text-xs">
          {formatDate(row.startDate)} – {formatDate(row.endDate)}
        </span>
      )),
    column<LeaveRequestRow>("totalDays", t("leaveRequests.columns.days"))
      .sortOn("totalDays")
      .format((value) => String(value)),
    column<LeaveRequestRow>("reason", t("leaveRequests.columns.reason")).unsortable().muted(),
    column<LeaveRequestRow>("status", t("leaveRequests.columns.status"))
      .sortOn("status")
      .render((_, row) => <LeaveStatusPill status={row.status} />),
    column<LeaveRequestRow>("id", t("common.actions"))
      .unsortable()
      .right()
      .render((_, row) => {
        if (!canApprove) return null
        if (row.status === "Pending")
          return (
            <div className="flex items-center justify-end gap-1">
              <ActionButton tone="primary" icon={Check} onClick={() => onAction(row, "approve")}>
                {t("leaveRequests.approve")}
              </ActionButton>
              <ActionButton icon={X} onClick={() => onAction(row, "reject")}>
                {t("leaveRequests.reject")}
              </ActionButton>
            </div>
          )
        if (row.status === "Approved")
          return (
            <div className="flex items-center justify-end">
              <ActionButton icon={X} onClick={() => onAction(row, "cancel")}>
                {t("leaveRequests.cancel")}
              </ActionButton>
            </div>
          )
        return null
      }),
  ]
}

export default function LeaveRequestsPage() {
  const { t } = useTranslation()
  const canApprove = useAuthStore((s) => s.hasPermission("leave.approve"))

  const [status, setStatus] = useState<string>("Pending")
  const [target, setTarget] = useState<{ row: LeaveRequestRow; action: Action } | null>(null)

  const reviewMutation = useResourceMutation<void, { id: number; approve: boolean }>(
    ({ id, approve }) => api.reviewLeave(id, approve),
    ["leave-requests"],
  )
  const cancelMutation = useResourceMutation<void, number>(
    (id) => api.cancelLeave(id),
    ["leave-requests"],
  )

  const columns = useMemo(
    () => buildColumns(t, canApprove, (row, action) => setTarget({ row, action })),
    [t, canApprove],
  )

  const sendData = useMemo(() => (status ? { status } : {}), [status])

  async function confirmAction() {
    if (!target) return
    if (target.action === "cancel") await cancelMutation.mutateAsync(target.row.id)
    else await reviewMutation.mutateAsync({ id: target.row.id, approve: target.action === "approve" })
    setTarget(null)
  }

  const statusOptions = useMemo(
    () => [
      { value: "", label: t("leaveRequests.filters.all") },
      ...LEAVE_STATUSES.map((s) => ({ value: s, label: t(`leaveStatus.${s}`) })),
    ],
    [t],
  )

  return (
    <Page
      title={t("leaveRequests.title")}
      icon={ClipboardCheck}
      description={t("leaveRequests.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.leave") },
        { label: t("nav.leaveApprovals") },
      ]}
    >
      <DataTable<LeaveRequestRow>
        url="leave-requests"
        columns={columns}
        rowKey="id"
        sendData={sendData}
        defaults={{ sortBy: "createdAt", sortDir: "desc", pageSize: 10 }}
        pageSizeOptions={[10, 25, 50]}
        searchPlaceholder={t("leaveRequests.search")}
        emptyMessage={t("leaveRequests.empty")}
        emptyIcon={ClipboardCheck}
        countNoun={t("leaveRequests.noun")}
        stickyHeader
        toolbar={
          <FormSelect
            id="status-filter"
            value={status}
            onValueChange={(v) => setStatus((v as string) ?? "")}
            options={statusOptions}
            className="w-48"
          />
        }
      />

      <ConfirmDialog
        open={target != null}
        title={t(`leaveRequests.${target?.action ?? "approve"}Title`)}
        description={t(`leaveRequests.${target?.action ?? "approve"}Description`)}
        confirmLabel={t(`leaveRequests.${target?.action ?? "approve"}`)}
        cancelLabel={t("common.cancel")}
        destructive={target?.action !== "approve"}
        onConfirm={confirmAction}
        onCancel={() => setTarget(null)}
      />
    </Page>
  )
}
