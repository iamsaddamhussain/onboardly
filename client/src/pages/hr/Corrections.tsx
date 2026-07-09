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
import { api, type CorrectionRow } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { CorrectionStatusPill, formatTime } from "@/pages/hr/attendance-helpers"
import { useAuthStore } from "@/store/auth-store"

function buildColumns(
  t: TFunction,
  canApprove: boolean,
  onReview: (row: CorrectionRow, approve: boolean) => void,
) {
  return [
    column<CorrectionRow>("date", t("corrections.columns.date"))
      .sortOn("date")
      .render((_, row) => <span className="font-medium">{formatDate(row.date)}</span>),
    column<CorrectionRow>("employeeName", t("corrections.columns.employee"))
      .unsortable()
      .render((_, row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.employeeName}</span>
          <span className="font-mono text-xs text-muted-foreground">{row.employeeNumber}</span>
        </div>
      )),
    column<CorrectionRow>("requestedCheckInAt", t("corrections.columns.requested"))
      .unsortable()
      .muted()
      .render((_, row) => (
        <span className="text-xs">
          {formatTime(row.requestedCheckInAt)} – {formatTime(row.requestedCheckOutAt)}
          {row.requestedStatus ? ` · ${t(`attendanceStatus.${row.requestedStatus}`)}` : ""}
        </span>
      )),
    column<CorrectionRow>("reason", t("corrections.columns.reason")).unsortable().muted(),
    column<CorrectionRow>("status", t("corrections.columns.status"))
      .sortOn("status")
      .render((_, row) => <CorrectionStatusPill status={row.status} />),
    column<CorrectionRow>("id", t("common.actions"))
      .unsortable()
      .right()
      .render((_, row) =>
        canApprove && row.status === "Pending" ? (
          <div className="flex items-center justify-end gap-1">
            <ActionButton tone="primary" icon={Check} onClick={() => onReview(row, true)}>
              {t("corrections.approve")}
            </ActionButton>
            <ActionButton icon={X} onClick={() => onReview(row, false)}>
              {t("corrections.reject")}
            </ActionButton>
          </div>
        ) : null,
      ),
  ]
}

export default function CorrectionsPage() {
  const { t } = useTranslation()
  const canApprove = useAuthStore((s) => s.hasPermission("attendance.approve"))

  const [status, setStatus] = useState<string>("Pending")
  const [target, setTarget] = useState<{ row: CorrectionRow; approve: boolean } | null>(null)

  const reviewMutation = useResourceMutation<void, { id: number; approve: boolean }>(
    ({ id, approve }) => api.reviewCorrection(id, approve),
    ["attendance-corrections", "attendance", "attendance/dashboard"],
  )

  const columns = useMemo(
    () => buildColumns(t, canApprove, (row, approve) => setTarget({ row, approve })),
    [t, canApprove],
  )

  const sendData = useMemo(() => (status ? { status } : {}), [status])

  async function confirmReview() {
    if (!target) return
    await reviewMutation.mutateAsync({ id: target.row.id, approve: target.approve })
    setTarget(null)
  }

  return (
    <Page
      title={t("corrections.title")}
      icon={ClipboardCheck}
      description={t("corrections.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.humanResources") },
        { label: t("nav.corrections") },
      ]}
    >
      <DataTable<CorrectionRow>
        url="attendance-corrections"
        columns={columns}
        rowKey="id"
        sendData={sendData}
        defaults={{ sortBy: "createdAt", sortDir: "desc", pageSize: 10 }}
        pageSizeOptions={[10, 25, 50]}
        searchPlaceholder={t("corrections.search")}
        emptyMessage={t("corrections.empty")}
        emptyIcon={ClipboardCheck}
        countNoun={t("corrections.noun")}
        stickyHeader
        toolbar={
          <FormSelect
            id="status-filter"
            value={status}
            onValueChange={(v) => setStatus((v as string) ?? "")}
            options={[
              { value: "", label: t("corrections.filters.all") },
              { value: "Pending", label: t("correctionStatus.Pending") },
              { value: "Approved", label: t("correctionStatus.Approved") },
              { value: "Rejected", label: t("correctionStatus.Rejected") },
            ]}
            className="w-48"
          />
        }
      />

      <ConfirmDialog
        open={target != null}
        title={target?.approve ? t("corrections.approveTitle") : t("corrections.rejectTitle")}
        description={target?.approve ? t("corrections.approveDescription") : t("corrections.rejectDescription")}
        confirmLabel={target?.approve ? t("corrections.approve") : t("corrections.reject")}
        cancelLabel={t("common.cancel")}
        destructive={!target?.approve}
        onConfirm={confirmReview}
        onCancel={() => setTarget(null)}
      />
    </Page>
  )
}
