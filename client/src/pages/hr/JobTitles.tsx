import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BriefcaseBusiness, Pencil, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Page } from "@/components/Page"
import { AppButton } from "@/components/AppButton"
import { ActionButton } from "@/components/ActionButton"
import { StatusPill } from "@/components/StatusPill"
import { FormSelect } from "@/components/FormSelect"
import { DataTable } from "@/components/datatable/DataTable"
import { column } from "@/components/datatable/column"
import { type JobTitleRow } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { formatDate } from "@/lib/format"

function buildColumns(t: TFunction, canEdit: boolean) {
  return [
    column<JobTitleRow>("isActive", t("jobTitles.columns.status"))
      .sortOn("status")
      .render((value) => (
        <StatusPill
          active={Boolean(value)}
          activeLabel={t("common.active")}
          inactiveLabel={t("common.inactive")}
        />
      )),
    column<JobTitleRow>("name", t("jobTitles.columns.name"))
      .sortOn("name")
      .render((_, row) => <span className="font-medium">{row.name}</span>),
    column<JobTitleRow>("code", t("jobTitles.columns.code")).sortOn("code").muted(),
    column<JobTitleRow>("description", t("jobTitles.columns.description"))
      .unsortable()
      .muted()
      .format((value) => (value as string | null) ?? t("common.dash")),
    column<JobTitleRow>("createdAt", t("jobTitles.columns.created"))
      .sortOn("createdAt")
      .muted()
      .format((value) => formatDate(value as string)),
    column<JobTitleRow>("id", t("common.actions"))
      .unsortable()
      .right()
      .render((_, row) =>
        canEdit ? (
          <div className="flex items-center justify-end">
            <ActionButton to={`/job-titles/${row.id}/edit`} icon={Pencil}>
              {t("common.edit")}
            </ActionButton>
          </div>
        ) : null,
      ),
  ]
}

export default function JobTitlesPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission("jobtitles.create")
  const canEdit = hasPermission("jobtitles.edit")

  const [status, setStatus] = useState<string>("")

  const columns = useMemo(() => buildColumns(t, canEdit), [t, canEdit])
  const sendData = useMemo(
    () => (status === "" ? {} : { isActive: status === "active" }),
    [status],
  )

  return (
    <Page
      title={t("jobTitles.title")}
      icon={BriefcaseBusiness}
      description={t("jobTitles.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.humanResources") },
        { label: t("nav.jobTitles") },
      ]}
      actions={
        canCreate ? (
          <AppButton icon={Plus} onClick={() => navigate("/job-titles/new")}>
            {t("jobTitles.newJobTitle")}
          </AppButton>
        ) : undefined
      }
    >
      <DataTable<JobTitleRow>
        url="jobtitles"
        columns={columns}
        rowKey="id"
        sendData={sendData}
        defaults={{ sortBy: "name", sortDir: "asc", pageSize: 10 }}
        pageSizeOptions={[10, 25, 50, 100]}
        searchPlaceholder={t("jobTitles.search")}
        emptyMessage={t("jobTitles.empty")}
        emptyIcon={BriefcaseBusiness}
        countNoun={t("jobTitles.noun")}
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
