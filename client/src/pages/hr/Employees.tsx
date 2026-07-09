import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, Pencil, Plus, UsersRound } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Page } from "@/components/Page"
import { AppButton } from "@/components/AppButton"
import { ActionButton } from "@/components/ActionButton"
import { FormSelect } from "@/components/FormSelect"
import { ServersideLookup } from "@/components/ServersideLookup"
import { DatePicker } from "@/components/DatePicker"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/components/datatable/DataTable"
import { column } from "@/components/datatable/column"
import {
  api,
  EMPLOYMENT_STATUSES,
  type DepartmentLookup,
  type EmployeeLookup,
  type EmployeeRow,
  type JobTitleLookup,
} from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { formatDate } from "@/lib/format"
import { EmploymentStatusPill } from "@/pages/hr/employment"

function buildColumns(t: TFunction, canEdit: boolean) {
  return [
    column<EmployeeRow>("employeeNumber", t("employees.columns.number"))
      .sortOn("employeeNumber")
      .render((_, row) => <span className="font-mono text-xs">{row.employeeNumber}</span>),
    column<EmployeeRow>("fullName", t("employees.columns.name"))
      .sortOn("name")
      .render((_, row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.fullName}</span>
          <span className="text-xs text-muted-foreground">{row.email}</span>
        </div>
      )),
    column<EmployeeRow>("departmentName", t("employees.columns.department"))
      .unsortable()
      .muted()
      .format((value) => (value as string | null) ?? t("common.dash")),
    column<EmployeeRow>("jobTitleName", t("employees.columns.jobTitle"))
      .unsortable()
      .muted()
      .format((value) => (value as string | null) ?? t("common.dash")),
    column<EmployeeRow>("reportingManagerName", t("employees.columns.manager"))
      .unsortable()
      .muted()
      .format((value) => (value as string | null) ?? t("common.dash")),
    column<EmployeeRow>("employmentStatus", t("employees.columns.status"))
      .sortOn("status")
      .render((_, row) => <EmploymentStatusPill status={row.employmentStatus} />),
    column<EmployeeRow>("joiningDate", t("employees.columns.joiningDate"))
      .sortOn("joiningDate")
      .muted()
      .format((value) => formatDate(value as string)),
    column<EmployeeRow>("id", t("common.actions"))
      .unsortable()
      .right()
      .render((_, row) => (
        <div className="flex items-center justify-end">
          <ActionButton to={`/employees/${row.id}`} icon={Eye}>
            {t("common.view")}
          </ActionButton>
          {canEdit && (
            <ActionButton to={`/employees/${row.id}/edit`} icon={Pencil}>
              {t("common.edit")}
            </ActionButton>
          )}
        </div>
      )),
  ]
}

export default function EmployeesPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission("employees.create")
  const canEdit = hasPermission("employees.edit")

  const [department, setDepartment] = useState<DepartmentLookup | null>(null)
  const [jobTitle, setJobTitle] = useState<JobTitleLookup | null>(null)
  const [manager, setManager] = useState<EmployeeLookup | null>(null)
  const [status, setStatus] = useState<string>("")
  const [from, setFrom] = useState<string>("")
  const [to, setTo] = useState<string>("")

  const columns = useMemo(() => buildColumns(t, canEdit), [t, canEdit])

  const sendData = useMemo(() => {
    const filters: Record<string, unknown> = {}
    if (department) filters.departmentId = department.id
    if (jobTitle) filters.jobTitleId = jobTitle.id
    if (manager) filters.reportingManagerId = manager.id
    if (status) filters.employmentStatus = status
    if (from) filters.joiningDateFrom = from
    if (to) filters.joiningDateTo = to
    return filters
  }, [department, jobTitle, manager, status, from, to])

  function clearFilters() {
    setDepartment(null)
    setJobTitle(null)
    setManager(null)
    setStatus("")
    setFrom("")
    setTo("")
  }

  const hasFilters = Boolean(department || jobTitle || manager || status || from || to)

  return (
    <Page
      title={t("employees.title")}
      icon={UsersRound}
      description={t("employees.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.humanResources") },
        { label: t("nav.employees") },
      ]}
      actions={
        canCreate ? (
          <AppButton icon={Plus} onClick={() => navigate("/employees/new")}>
            {t("employees.newEmployee")}
          </AppButton>
        ) : undefined
      }
    >
      <DataTable<EmployeeRow>
        url="employees"
        columns={columns}
        rowKey="id"
        sendData={sendData}
        defaults={{ sortBy: "createdAt", sortDir: "desc", pageSize: 10 }}
        pageSizeOptions={[10, 25, 50, 100]}
        searchPlaceholder={t("employees.search")}
        emptyMessage={t("employees.empty")}
        emptyIcon={UsersRound}
        countNoun={t("employees.noun")}
        stickyHeader
        onRowClick={(row) => navigate(`/employees/${row.id}`)}
        beforeTable={
          <div className="grid gap-3 border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("employees.filters.department")}</Label>
              <ServersideLookup<DepartmentLookup>
                value={department}
                onChange={(v) => setDepartment((v as DepartmentLookup | null) ?? null)}
                queryCallback={(term) => api.lookupDepartments(term)}
                optionLabel={(d) => d.name}
                placeholder="employees.filters.any"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("employees.filters.jobTitle")}</Label>
              <ServersideLookup<JobTitleLookup>
                value={jobTitle}
                onChange={(v) => setJobTitle((v as JobTitleLookup | null) ?? null)}
                queryCallback={(term) => api.lookupJobTitles(term)}
                optionLabel={(j) => j.name}
                placeholder="employees.filters.any"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("employees.filters.manager")}</Label>
              <ServersideLookup<EmployeeLookup>
                value={manager}
                onChange={(v) => setManager((v as EmployeeLookup | null) ?? null)}
                queryCallback={(term) => api.lookupEmployees(term)}
                optionLabel={(e) => e.fullName}
                placeholder="employees.filters.any"
              />
            </div>
            <FormSelect
              label={t("employees.filters.status")}
              value={status}
              onValueChange={(v) => setStatus((v as string) ?? "")}
              options={[
                { value: "", label: t("employees.filters.any") },
                ...EMPLOYMENT_STATUSES.map((s) => ({
                  value: s,
                  label: t(`employment.status.${s}`),
                })),
              ]}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="from">{t("employees.filters.joinedFrom")}</Label>
              <DatePicker id="from" value={from} onChange={setFrom} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="to">{t("employees.filters.joinedTo")}</Label>
              <DatePicker id="to" value={to} onChange={setTo} />
            </div>
            {hasFilters && (
              <div className="flex items-end">
                <AppButton variant="outline" onClick={clearFilters}>
                  {t("employees.filters.clear")}
                </AppButton>
              </div>
            )}
          </div>
        }
      />
    </Page>
  )
}
