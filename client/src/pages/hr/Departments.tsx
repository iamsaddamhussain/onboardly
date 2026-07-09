import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Network, Pencil, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Page } from "@/components/Page"
import { AppButton } from "@/components/AppButton"
import { ActionButton } from "@/components/ActionButton"
import { StatusPill } from "@/components/StatusPill"
import { FormSelect } from "@/components/FormSelect"
import { DataTable } from "@/components/datatable/DataTable"
import { column } from "@/components/datatable/column"
import { type DepartmentRow } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { formatDate } from "@/lib/format"

function buildColumns(t: TFunction, canEdit: boolean) {
  return [
    column<DepartmentRow>("isActive", t("departments.columns.status"))
      .sortOn("status")
      .render((value) => (
        <StatusPill
          active={Boolean(value)}
          activeLabel={t("common.active")}
          inactiveLabel={t("common.inactive")}
        />
      )),
    column<DepartmentRow>("name", t("departments.columns.name"))
      .sortOn("name")
      .render((_, row) => <span className="font-medium">{row.name}</span>),
    column<DepartmentRow>("code", t("departments.columns.code")).sortOn("code").muted(),
    column<DepartmentRow>("parentDepartmentName", t("departments.columns.parent"))
      .unsortable()
      .muted()
      .format((value) => (value as string | null) ?? t("common.dash")),
    column<DepartmentRow>("managerName", t("departments.columns.manager"))
      .unsortable()
      .muted()
      .format((value) => (value as string | null) ?? t("common.dash")),
    column<DepartmentRow>("createdAt", t("departments.columns.created"))
      .sortOn("createdAt")
      .muted()
      .format((value) => formatDate(value as string)),
    column<DepartmentRow>("id", t("common.actions"))
      .unsortable()
      .right()
      .render((_, row) =>
        canEdit ? (
          <div className="flex items-center justify-end">
            <ActionButton to={`/departments/${row.id}/edit`} icon={Pencil}>
              {t("common.edit")}
            </ActionButton>
          </div>
        ) : null,
      ),
  ]
}

export default function DepartmentsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission("departments.create")
  const canEdit = hasPermission("departments.edit")

  const [status, setStatus] = useState<string>("")

  const columns = useMemo(() => buildColumns(t, canEdit), [t, canEdit])
  const sendData = useMemo(
    () => (status === "" ? {} : { isActive: status === "active" }),
    [status],
  )

  return (
    <Page
      title={t("departments.title")}
      icon={Network}
      description={t("departments.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.humanResources") },
        { label: t("nav.departments") },
      ]}
      actions={
        canCreate ? (
          <AppButton icon={Plus} onClick={() => navigate("/departments/new")}>
            {t("departments.newDepartment")}
          </AppButton>
        ) : undefined
      }
    >
      <DataTable<DepartmentRow>
        url="departments"
        columns={columns}
        rowKey="id"
        sendData={sendData}
        defaults={{ sortBy: "name", sortDir: "asc", pageSize: 10 }}
        pageSizeOptions={[10, 25, 50, 100]}
        searchPlaceholder={t("departments.search")}
        emptyMessage={t("departments.empty")}
        emptyIcon={Network}
        countNoun={t("departments.noun")}
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
