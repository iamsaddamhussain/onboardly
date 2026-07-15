import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CalendarCheck, Pencil, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Page } from "@/components/Page"
import { AppButton } from "@/components/AppButton"
import { ActionButton } from "@/components/ActionButton"
import { StatusPill } from "@/components/StatusPill"
import { FormSelect } from "@/components/FormSelect"
import { DataTable } from "@/components/datatable/DataTable"
import { column } from "@/components/datatable/column"
import { type LeaveTypeRow } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { formatDate } from "@/lib/format"

function buildColumns(t: TFunction, canManage: boolean) {
  return [
    column<LeaveTypeRow>("isActive", t("leaveTypes.columns.status"))
      .sortOn("status")
      .render((value) => (
        <StatusPill
          active={Boolean(value)}
          activeLabel={t("common.active")}
          inactiveLabel={t("common.inactive")}
        />
      )),
    column<LeaveTypeRow>("name", t("leaveTypes.columns.name"))
      .sortOn("name")
      .render((_, row) => (
        <span className="flex items-center gap-2 font-medium">
          <span
            className="inline-block size-3 shrink-0 rounded-full"
            style={{ backgroundColor: row.color }}
          />
          {row.name}
        </span>
      )),
    column<LeaveTypeRow>("code", t("leaveTypes.columns.code")).sortOn("code").muted(),
    column<LeaveTypeRow>("isPaid", t("leaveTypes.columns.paid"))
      .unsortable()
      .format((value) => (value ? t("leaveTypes.paid") : t("leaveTypes.unpaid"))),
    column<LeaveTypeRow>("requiresApproval", t("leaveTypes.columns.approval"))
      .unsortable()
      .format((value) => (value ? t("common.yes") : t("common.no"))),
    column<LeaveTypeRow>("allowHalfDay", t("leaveTypes.columns.halfDay"))
      .unsortable()
      .format((value) => (value ? t("common.yes") : t("common.no"))),
    column<LeaveTypeRow>("createdAt", t("leaveTypes.columns.created"))
      .sortOn("createdAt")
      .muted()
      .format((value) => formatDate(value as string)),
    column<LeaveTypeRow>("id", t("common.actions"))
      .unsortable()
      .right()
      .render((_, row) =>
        canManage ? (
          <div className="flex items-center justify-end">
            <ActionButton to={`/leave-types/${row.id}/edit`} icon={Pencil}>
              {t("common.edit")}
            </ActionButton>
          </div>
        ) : null,
      ),
  ]
}

export default function LeaveTypesPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const canManage = useAuthStore((s) => s.hasPermission("leave.manage_types"))

  const [status, setStatus] = useState<string>("")

  const columns = useMemo(() => buildColumns(t, canManage), [t, canManage])
  const sendData = useMemo(
    () => (status === "" ? {} : { isActive: status === "active" }),
    [status],
  )

  return (
    <Page
      title={t("leaveTypes.title")}
      icon={CalendarCheck}
      description={t("leaveTypes.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.leave") },
        { label: t("nav.leaveTypes") },
      ]}
      actions={
        canManage ? (
          <AppButton icon={Plus} onClick={() => navigate("/leave-types/new")}>
            {t("leaveTypes.newLeaveType")}
          </AppButton>
        ) : undefined
      }
    >
      <DataTable<LeaveTypeRow>
        url="leave-types"
        columns={columns}
        rowKey="id"
        sendData={sendData}
        defaults={{ sortBy: "name", sortDir: "asc", pageSize: 10 }}
        pageSizeOptions={[10, 25, 50, 100]}
        searchPlaceholder={t("leaveTypes.search")}
        emptyMessage={t("leaveTypes.empty")}
        emptyIcon={CalendarCheck}
        countNoun={t("leaveTypes.noun")}
        stickyHeader
        toolbar={
          <FormSelect
            id="status-filter"
            value={status}
            onValueChange={(v) => setStatus((v as string) ?? "")}
            options={[
              { value: "", label: t("common.allStatuses") },
              { value: "active", label: t("common.active") },
              { value: "inactive", label: t("common.inactive") },
            ]}
            className="w-44"
          />
        }
      />
    </Page>
  )
}
