import { useEffect, useMemo, useState, type FormEvent } from "react"
import { CalendarClock, Coffee, LogIn, LogOut, Send } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Page } from "@/components/Page"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AppButton } from "@/components/AppButton"
import { FormSection } from "@/components/FormSection"
import { FormInput } from "@/components/FormInput"
import { FormSelect } from "@/components/FormSelect"
import { DatePicker } from "@/components/DatePicker"
import { TimePicker } from "@/components/TimePicker"
import { DataTable } from "@/components/datatable/DataTable"
import { column } from "@/components/datatable/column"
import { useResource, useResourceMutation } from "@/lib/query"
import { post } from "@/lib/resource"
import {
  ApiError,
  api,
  ATTENDANCE_STATUSES,
  type AttendanceRow,
  type CorrectionRow,
  type MyAttendanceToday,
} from "@/lib/api"
import { formatDate, formatMinutes, formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  AttendanceStatusPill,
  CorrectionStatusPill,
} from "@/pages/hr/attendance-helpers"

function historyColumns(t: TFunction) {
  return [
    column<AttendanceRow>("date", t("attendance.columns.date"))
      .sortOn("date")
      .render((_, row) => <span className="font-medium">{formatDate(row.date)}</span>),
    column<AttendanceRow>("checkInAt", t("attendance.columns.checkIn"))
      .unsortable()
      .muted()
      .format((v) => formatTime(v as string | null)),
    column<AttendanceRow>("checkOutAt", t("attendance.columns.checkOut"))
      .unsortable()
      .muted()
      .format((v) => formatTime(v as string | null)),
    column<AttendanceRow>("workedMinutes", t("attendance.columns.worked"))
      .sortOn("worked")
      .muted()
      .format((v) => formatMinutes(v as number)),
    column<AttendanceRow>("overtimeMinutes", t("attendance.columns.overtime"))
      .sortOn("overtime")
      .muted()
      .format((v) => formatMinutes(v as number)),
    column<AttendanceRow>("status", t("attendance.columns.status"))
      .sortOn("status")
      .render((_, row) => <AttendanceStatusPill status={row.status} />),
  ]
}

function correctionColumns(t: TFunction) {
  return [
    column<CorrectionRow>("date", t("corrections.columns.date"))
      .sortOn("date")
      .render((_, row) => <span className="font-medium">{formatDate(row.date)}</span>),
    column<CorrectionRow>("reason", t("corrections.columns.reason")).unsortable().muted(),
    column<CorrectionRow>("status", t("corrections.columns.status"))
      .sortOn("status")
      .render((_, row) => <CorrectionStatusPill status={row.status} />),
    column<CorrectionRow>("reviewNotes", t("corrections.columns.reviewNotes"))
      .unsortable()
      .muted()
      .format((v) => (v as string | null) ?? t("common.dash")),
    column<CorrectionRow>("createdAt", t("corrections.columns.submitted"))
      .sortOn("createdAt")
      .muted()
      .format((v) => formatDate(v as string)),
  ]
}

const emptyCorrection = {
  date: new Date().toISOString().slice(0, 10),
  checkInTime: "",
  checkOutTime: "",
  requestedStatus: "",
  reason: "",
}

// Render seconds as a running H:MM:SS clock.
function formatHms(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

export default function MyAttendancePage() {
  const { t } = useTranslation()
  const { data: today, refetch } = useResource<MyAttendanceToday>("attendance/me")

  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(emptyCorrection)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const historyCols = useMemo(() => historyColumns(t), [t])
  const mineCols = useMemo(() => correctionColumns(t), [t])

  async function punch(action: () => Promise<unknown>) {
    setBusy(true)
    try {
      await action()
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  const correctionMutation = useResourceMutation<{ id: number }, typeof emptyCorrection>(
    (data) =>
      post<{ id: number }>("attendance-corrections", {
        date: data.date,
        requestedCheckInAt: data.checkInTime
          ? new Date(`${data.date}T${data.checkInTime}:00`).toISOString()
          : null,
        requestedCheckOutAt: data.checkOutTime
          ? new Date(`${data.date}T${data.checkOutTime}:00`).toISOString()
          : null,
        requestedStatus: data.requestedStatus || null,
        reason: data.reason.trim(),
      }),
    ["attendance-corrections/mine"],
  )

  async function submitCorrection(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    try {
      await correctionMutation.mutateAsync(form)
      setForm(emptyCorrection)
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors)
    }
  }

  const status = today?.status ?? "Absent"
  const canCheckIn = today && !today.isCheckedIn && !today.hasCheckedOut
  const canCheckOut = today?.isCheckedIn
  const onBreak = today?.isOnBreak ?? false

  // Tick every second while checked in so the live worked/break clocks advance.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!today?.isCheckedIn) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [today?.isCheckedIn])

  const running = Boolean(today?.isCheckedIn)
  const checkInMs = today?.checkInAt ? new Date(today.checkInAt).getTime() : null
  const closedBreakMs = (today?.breakMinutes ?? 0) * 60_000
  const openBreakMs =
    onBreak && today?.currentBreakStartedAt
      ? Math.max(0, now - new Date(today.currentBreakStartedAt).getTime())
      : 0
  // While checked in, worked runs live and freezes during a break; break runs
  // live only while on a break.
  const workedSeconds =
    running && checkInMs
      ? Math.max(0, (now - checkInMs - closedBreakMs - openBreakMs) / 1000)
      : (today?.workedMinutes ?? 0) * 60
  const breakSeconds = running
    ? (closedBreakMs + openBreakMs) / 1000
    : (today?.breakMinutes ?? 0) * 60

  return (
    <Page
      title={t("myAttendance.title")}
      icon={CalendarClock}
      description={t("myAttendance.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.myAttendance") },
      ]}
    >
      <div className="flex flex-col gap-6">
        <Card className="gap-5 rounded-none p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {today ? formatDate(today.date) : t("common.dash")}
              </p>
              <div className="mt-1 flex items-center gap-3">
                <AttendanceStatusPill status={status} />
                {today?.checkInAt && (
                  <span className="text-xs text-muted-foreground">
                    {t("myAttendance.checkedInAt", { time: formatTime(today.checkInAt) })}
                  </span>
                )}
                {today?.checkOutAt && (
                  <span className="text-xs text-muted-foreground">
                    {t("myAttendance.checkedOutAt", { time: formatTime(today.checkOutAt) })}
                  </span>
                )}
                {running && onBreak && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-500">
                    <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
                    {t("myAttendance.onBreak")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{t("myAttendance.worked")}</p>
                <p className={cn("font-semibold tabular-nums", running && "text-lg text-primary")}>
                  {running ? formatHms(workedSeconds) : formatMinutes(today?.workedMinutes ?? 0)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{t("myAttendance.break")}</p>
                <p className={cn("font-semibold tabular-nums", running && onBreak && "text-amber-500")}>
                  {running ? formatHms(breakSeconds) : formatMinutes(today?.breakMinutes ?? 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <AppButton icon={LogIn} disabled={busy || !canCheckIn} onClick={() => punch(api.attendanceCheckIn)}>
              {t("myAttendance.checkIn")}
            </AppButton>
            <AppButton
              variant="outline"
              icon={Coffee}
              disabled={busy || !canCheckOut}
              onClick={() => punch(onBreak ? api.attendanceBreakEnd : api.attendanceBreakStart)}
            >
              {onBreak ? t("myAttendance.endBreak") : t("myAttendance.startBreak")}
            </AppButton>
            <AppButton
              variant="destructive"
              icon={LogOut}
              disabled={busy || !canCheckOut}
              onClick={() => punch(api.attendanceCheckOut)}
            >
              {t("myAttendance.checkOut")}
            </AppButton>
          </div>
        </Card>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t("myAttendance.history")}
          </h2>
          <DataTable<AttendanceRow>
            url="attendance/me/history"
            columns={historyCols}
            rowKey="id"
            defaults={{ sortBy: "date", sortDir: "desc", pageSize: 10 }}
            searchable={false}
            emptyMessage={t("myAttendance.noHistory")}
            emptyIcon={CalendarClock}
            countNoun={t("attendance.noun")}
          />
        </div>

        <form onSubmit={submitCorrection}>
          <FormSection title={t("myAttendance.requestCorrection")} icon={Send} defaultCollapsed>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-date" required>
                  {t("attendanceForm.date")}
                </Label>
                <DatePicker
                  id="c-date"
                  value={form.date}
                  clearable={false}
                  onChange={(v) => setForm((p) => ({ ...p, date: v }))}
                />
              </div>
              <FormSelect
                id="c-status"
                label={t("corrections.requestedStatus")}
                value={form.requestedStatus}
                onValueChange={(v) => setForm((p) => ({ ...p, requestedStatus: (v as string) ?? "" }))}
                options={[
                  { value: "", label: t("attendance.filters.any") },
                  ...ATTENDANCE_STATUSES.map((s) => ({ value: s, label: t(`attendanceStatus.${s}`) })),
                ]}
              />
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-in">{t("attendanceForm.checkIn")}</Label>
                <TimePicker
                  id="c-in"
                  value={form.checkInTime}
                  onChange={(v) => setForm((p) => ({ ...p, checkInTime: v }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-out">{t("attendanceForm.checkOut")}</Label>
                <TimePicker
                  id="c-out"
                  value={form.checkOutTime}
                  onChange={(v) => setForm((p) => ({ ...p, checkOutTime: v }))}
                />
              </div>
            </div>

            <FormInput
              id="c-reason"
              type="textarea"
              rows={2}
              required
              label={t("corrections.reason")}
              value={form.reason}
              onValueChange={(v) => setForm((p) => ({ ...p, reason: (v as string) ?? "" }))}
              error={errors.reason}
            />

            <div className="flex justify-end">
              <AppButton type="submit" icon={Send} loading={correctionMutation.isPending}>
                {t("corrections.submit")}
              </AppButton>
            </div>
          </FormSection>
        </form>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t("myAttendance.myCorrections")}
          </h2>
          <DataTable<CorrectionRow>
            url="attendance-corrections/mine"
            columns={mineCols}
            rowKey="id"
            defaults={{ sortBy: "createdAt", sortDir: "desc", pageSize: 5 }}
            searchable={false}
            emptyMessage={t("corrections.empty")}
            emptyIcon={Send}
            countNoun={t("corrections.noun")}
          />
        </div>
      </div>
    </Page>
  )
}
