import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CalendarCheck, Download, Pencil, Plus } from "lucide-react"
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
  ATTENDANCE_STATUSES,
  type AttendanceRow,
  type DepartmentLookup,
  type EmployeeLookup,
} from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { formatDate } from "@/lib/format"
import {
  AttendanceStatusPill,
  formatMinutes,
  formatTime,
} from "@/pages/hr/attendance-helpers"

function buildColumns(t: TFunction, canEdit: boolean) {
  return [
    column<AttendanceRow>("date", t("attendance.columns.date"))
      .sortOn("date")
      .render((_, row) => <span className="font-medium">{formatDate(row.date)}</span>),
    column<AttendanceRow>("employeeName", t("attendance.columns.employee"))
      .sortOn("name")
      .render((_, row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.employeeName}</span>
          <span className="font-mono text-xs text-muted-foreground">{row.employeeNumber}</span>
        </div>
      )),
    column<AttendanceRow>("departmentName", t("attendance.columns.department"))
      .unsortable()
      .muted()
      .format((value) => (value as string | null) ?? t("common.dash")),
    column<AttendanceRow>("checkInAt", t("attendance.columns.checkIn"))
      .unsortable()
      .muted()
      .format((value) => formatTime(value as string | null)),
    column<AttendanceRow>("checkOutAt", t("attendance.columns.checkOut"))
      .unsortable()
      .muted()
      .format((value) => formatTime(value as string | null)),
    column<AttendanceRow>("workedMinutes", t("attendance.columns.worked"))
      .sortOn("worked")
      .muted()
      .format((value) => formatMinutes(value as number)),
    column<AttendanceRow>("overtimeMinutes", t("attendance.columns.overtime"))
      .sortOn("overtime")
      .muted()
      .format((value) => formatMinutes(value as number)),
    column<AttendanceRow>("status", t("attendance.columns.status"))
      .sortOn("status")
      .render((_, row) => <AttendanceStatusPill status={row.status} />),
    column<AttendanceRow>("id", t("common.actions"))
      .unsortable()
      .right()
      .render((_, row) =>
        canEdit ? (
          <div className="flex items-center justify-end">
            <ActionButton to={`/attendance/${row.id}/edit`} icon={Pencil}>
              {t("common.edit")}
            </ActionButton>
          </div>
        ) : null,
      ),
  ]
}

export default function AttendancePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreate = hasPermission("attendance.create")
  const canEdit = hasPermission("attendance.edit")
  const canExport = hasPermission("attendance.export")

  const [employee, setEmployee] = useState<EmployeeLookup | null>(null)
  const [department, setDepartment] = useState<DepartmentLookup | null>(null)
  const [status, setStatus] = useState<string>("")
  const [from, setFrom] = useState<string>("")
  const [to, setTo] = useState<string>("")

  const columns = useMemo(() => buildColumns(t, canEdit), [t, canEdit])

  const sendData = useMemo(() => {
    const f: Record<string, unknown> = {}
    if (employee) f.employeeId = employee.id
    if (department) f.departmentId = department.id
    if (status) f.status = status
    if (from) f.dateFrom = from
    if (to) f.dateTo = to
    return f
  }, [employee, department, status, from, to])

  async function handleExport() {
    const blob = await api.exportAttendance({
      employeeId: employee?.id,
      departmentId: department?.id,
      status: (status || undefined) as never,
      dateFrom: from || undefined,
      dateTo: to || undefined,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Page
      title={t("attendance.title")}
      icon={CalendarCheck}
      description={t("attendance.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.humanResources") },
        { label: t("nav.attendance") },
      ]}
      actions={
        <div className="flex gap-2">
          {canExport && (
            <AppButton variant="outline" icon={Download} onClick={handleExport}>
              {t("attendance.export")}
            </AppButton>
          )}
          {canCreate && (
            <AppButton icon={Plus} onClick={() => navigate("/attendance/new")}>
              {t("attendance.newEntry")}
            </AppButton>
          )}
        </div>
      }
    >
      <DataTable<AttendanceRow>
        url="attendance"
        columns={columns}
        rowKey="id"
        sendData={sendData}
        defaults={{ sortBy: "date", sortDir: "desc", pageSize: 10 }}
        pageSizeOptions={[10, 25, 50, 100]}
        searchPlaceholder={t("attendance.search")}
        emptyMessage={t("attendance.empty")}
        emptyIcon={CalendarCheck}
        countNoun={t("attendance.noun")}
        stickyHeader
        beforeTable={
          <div className="grid gap-3 border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("attendance.filters.employee")}</Label>
              <ServersideLookup<EmployeeLookup>
                value={employee}
                onChange={(v) => setEmployee((v as EmployeeLookup | null) ?? null)}
                queryCallback={(term) => api.lookupEmployees(term)}
                optionLabel={(e) => `${e.fullName} (${e.employeeNumber})`}
                placeholder="attendance.filters.any"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("attendance.filters.department")}</Label>
              <ServersideLookup<DepartmentLookup>
                value={department}
                onChange={(v) => setDepartment((v as DepartmentLookup | null) ?? null)}
                queryCallback={(term) => api.lookupDepartments(term)}
                optionLabel={(d) => d.name}
                placeholder="attendance.filters.any"
              />
            </div>
            <FormSelect
              label={t("attendance.filters.status")}
              value={status}
              onValueChange={(v) => setStatus((v as string) ?? "")}
              options={[
                { value: "", label: t("attendance.filters.any") },
                ...ATTENDANCE_STATUSES.map((s) => ({
                  value: s,
                  label: t(`attendanceStatus.${s}`),
                })),
              ]}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="from">{t("attendance.filters.from")}</Label>
              <DatePicker id="from" value={from} onChange={setFrom} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="to">{t("attendance.filters.to")}</Label>
              <DatePicker id="to" value={to} onChange={setTo} />
            </div>
          </div>
        }
      />
    </Page>
  )
}
