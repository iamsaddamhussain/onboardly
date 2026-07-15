import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ClipboardCheck, Pencil, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Page } from "@/components/Page"
import { AppButton } from "@/components/AppButton"
import { ActionButton } from "@/components/ActionButton"
import { StatusPill } from "@/components/StatusPill"
import { FormSelect } from "@/components/FormSelect"
import { DataTable } from "@/components/datatable/DataTable"
import { column } from "@/components/datatable/column"
import { type LeavePolicyRow } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { formatDate } from "@/lib/format"

function buildColumns(t: TFunction, canManage: boolean) {
  return [
    column<LeavePolicyRow>("name", t("leavePolicies.columns.name"))
      .sortOn("name")
      .render((_, row) => (
        <span className="flex items-center gap-2 font-medium">
          {row.name}
          {row.isDefault && (
            <span className="bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {t("leavePolicies.default")}
            </span>
          )}
        </span>
      )),
    column<LeavePolicyRow>("code", t("leavePolicies.columns.code")).sortOn("code").muted(),
    column<LeavePolicyRow>("leaveTypeCount", t("leavePolicies.columns.leaveTypes"))
      .unsortable()
      .muted()
      .format((value) => String(value)),
    column<LeavePolicyRow>("isActive", t("leavePolicies.columns.status"))
      .sortOn("status")
      .render((value) => (
        <StatusPill
          active={Boolean(value)}
          activeLabel={t("common.active")}
          inactiveLabel={t("common.inactive")}
        />
      )),
    column<LeavePolicyRow>("createdAt", t("leavePolicies.columns.created"))
      .sortOn("createdAt")
      .muted()
      .format((value) => formatDate(value as string)),
    column<LeavePolicyRow>("id", t("common.actions"))
      .unsortable()
      .right()
      .render((_, row) =>
        canManage ? (
          <div className="flex items-center justify-end">
            <ActionButton to={`/leave-policies/${row.id}/edit`} icon={Pencil}>
              {t("common.edit")}
            </ActionButton>
          </div>
        ) : null,
      ),
  ]
}

export default function LeavePoliciesPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const canManage = useAuthStore((s) => s.hasPermission("leave.manage_policies"))

  const [status, setStatus] = useState<string>("")

  const columns = useMemo(() => buildColumns(t, canManage), [t, canManage])
  const sendData = useMemo(
    () => (status === "" ? {} : { isActive: status === "active" }),
    [status],
  )

  return (
    <Page
      title={t("leavePolicies.title")}
      icon={ClipboardCheck}
      description={t("leavePolicies.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.leave") },
        { label: t("nav.leavePolicies") },
      ]}
      actions={
        canManage ? (
          <AppButton icon={Plus} onClick={() => navigate("/leave-policies/new")}>
            {t("leavePolicies.newPolicy")}
          </AppButton>
        ) : undefined
      }
    >
      <DataTable<LeavePolicyRow>
        url="leave-policies"
        columns={columns}
        rowKey="id"
        sendData={sendData}
        defaults={{ sortBy: "name", sortDir: "asc", pageSize: 10 }}
        pageSizeOptions={[10, 25, 50]}
        searchPlaceholder={t("leavePolicies.search")}
        emptyMessage={t("leavePolicies.empty")}
        emptyIcon={ClipboardCheck}
        countNoun={t("leavePolicies.noun")}
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
