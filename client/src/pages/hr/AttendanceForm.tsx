import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, CalendarCheck, Clock } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { FormSection } from "@/components/FormSection"
import { FormInput } from "@/components/FormInput"
import { FormSelect } from "@/components/FormSelect"
import { ServersideLookup } from "@/components/ServersideLookup"
import { AppButton } from "@/components/AppButton"
import { DatePicker } from "@/components/DatePicker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useResource, useResourceMutation } from "@/lib/query"
import { post } from "@/lib/resource"
import {
  ApiError,
  api,
  ATTENDANCE_STATUSES,
  type AttendanceDetail,
  type EmployeeLookup,
} from "@/lib/api"

// Extract the local "HH:mm" from an ISO timestamp, for the time inputs.
function timeOf(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

// Combine a yyyy-mm-dd date and HH:mm time into an ISO string, or null.
function combine(date: string, time: string): string | null {
  if (!date || !time) return null
  return new Date(`${date}T${time}:00`).toISOString()
}

const empty = {
  date: new Date().toISOString().slice(0, 10),
  checkInTime: "",
  checkOutTime: "",
  breakMinutes: 0,
  status: "Present",
  remarks: "",
}

type FormState = typeof empty

export default function AttendanceFormPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { id } = useParams()
  const editing = id != null
  const recordId = id ? Number(id) : null
  const invalidId = editing && (recordId == null || Number.isNaN(recordId))

  const [form, setForm] = useState<FormState>(empty)
  const [employee, setEmployee] = useState<EmployeeLookup | null>(null)
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: existing, isLoading, isError } = useResource<AttendanceDetail>(
    `attendance/${recordId}`,
    {},
    { enabled: editing && !invalidId },
  )

  useEffect(() => {
    if (invalidId || isError) navigate("/attendance", { replace: true })
  }, [invalidId, isError, navigate])

  useEffect(() => {
    if (!existing) return
    setForm({
      date: existing.date.slice(0, 10),
      checkInTime: timeOf(existing.checkInAt),
      checkOutTime: timeOf(existing.checkOutAt),
      breakMinutes: existing.breakMinutes,
      status: existing.status,
      remarks: existing.remarks ?? "",
    })
    setEmployee({
      id: existing.employeeId,
      fullName: existing.employeeName,
      employeeNumber: existing.employeeNumber,
    })
    setEmployeeId(existing.employeeId)
    setDirty(false)
  }, [existing])

  // Manual entry upserts by employee + date, so it always POSTs.
  const mutation = useResourceMutation<AttendanceDetail, FormState>(
    (data) =>
      post<AttendanceDetail>("attendance", {
        employeeId,
        date: data.date,
        checkInAt: combine(data.date, data.checkInTime),
        checkOutAt: combine(data.date, data.checkOutTime),
        breakMinutes: Number(data.breakMinutes) || 0,
        status: data.status,
        remarks: data.remarks.trim() || null,
      }),
    ["attendance", "attendance/dashboard"],
  )

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    if (employeeId == null) {
      setErrors({ employeeId: t("attendanceForm.employeeRequired") })
      return
    }
    try {
      await mutation.mutateAsync(form)
      navigate("/attendance")
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors)
    }
  }

  function requestLeave() {
    if (dirty) setConfirmOpen(true)
    else navigate("/attendance")
  }

  return (
    <Page
      title={editing ? t("attendanceForm.editTitle") : t("attendanceForm.newTitle")}
      icon={CalendarCheck}
      description={editing ? t("attendanceForm.editDescription") : t("attendanceForm.newDescription")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.attendance"), to: "/attendance" },
        { label: editing ? t("attendanceForm.editTitle") : t("attendanceForm.newTitle") },
      ]}
      loading={editing && isLoading}
      actions={
        <AppButton variant="outline" icon={ArrowLeft} onClick={requestLeave}>
          {t("common.back")}
        </AppButton>
      }
    >
      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
        <FormSection title={t("attendanceForm.details")} icon={CalendarCheck}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="employee" required>
              {t("attendanceForm.employee")}
            </Label>
            <ServersideLookup<EmployeeLookup>
              id="employee"
              value={employee}
              disabled={editing}
              onChange={(value) => {
                const e = (value as EmployeeLookup | null) ?? null
                setEmployee(e)
                setEmployeeId(e ? e.id : null)
                setDirty(true)
              }}
              queryCallback={(term) => api.lookupEmployees(term)}
              optionLabel={(e) => `${e.fullName} (${e.employeeNumber})`}
              placeholder="attendanceForm.employeePlaceholder"
              aria-invalid={!!errors.employeeId}
            />
            {errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date" required>
                {t("attendanceForm.date")}
              </Label>
              <DatePicker
                id="date"
                value={form.date}
                disabled={editing}
                clearable={false}
                onChange={(v) => update("date", v)}
                aria-invalid={!!errors.date}
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>

            <FormSelect
              id="status"
              label={t("attendanceForm.status")}
              required
              value={form.status}
              onValueChange={(v) => update("status", (v as string) ?? "Present")}
              options={ATTENDANCE_STATUSES.map((s) => ({
                value: s,
                label: t(`attendanceStatus.${s}`),
              }))}
              error={errors.status}
            />
          </div>
        </FormSection>

        <FormSection title={t("attendanceForm.times")} icon={Clock}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="checkIn">{t("attendanceForm.checkIn")}</Label>
              <Input
                id="checkIn"
                type="time"
                value={form.checkInTime}
                onChange={(e) => update("checkInTime", e.target.value)}
                className="rounded-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="checkOut">{t("attendanceForm.checkOut")}</Label>
              <Input
                id="checkOut"
                type="time"
                value={form.checkOutTime}
                onChange={(e) => update("checkOutTime", e.target.value)}
                className="rounded-none"
              />
            </div>
          </div>

          <FormInput
            id="breakMinutes"
            type="number"
            min={0}
            max={1440}
            label={t("attendanceForm.breakMinutes")}
            value={form.breakMinutes}
            onValueChange={(v) => update("breakMinutes", (v as number) ?? 0)}
            error={errors.breakMinutes}
            hint={t("attendanceForm.breakHint")}
          />

          <FormInput
            id="remarks"
            type="textarea"
            rows={2}
            label={t("attendanceForm.remarks")}
            value={form.remarks}
            onValueChange={(v) => update("remarks", (v as string) ?? "")}
            error={errors.remarks}
          />
        </FormSection>

        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="outline" onClick={requestLeave}>
            {t("common.cancel")}
          </AppButton>
          <AppButton
            type="submit"
            loading={mutation.isPending}
            loadingText={t("common.saving")}
          >
            {t("common.saveChanges")}
          </AppButton>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title={t("common.discardTitle")}
        description={t("common.discardDescription")}
        confirmLabel={t("common.discard")}
        cancelLabel={t("common.cancel")}
        destructive
        onConfirm={() => {
          setConfirmOpen(false)
          navigate("/attendance")
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </Page>
  )
}
