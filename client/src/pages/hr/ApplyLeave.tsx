import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, CalendarClock } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { FormSection } from "@/components/FormSection"
import { FormInput } from "@/components/FormInput"
import { AppButton } from "@/components/AppButton"
import { DatePicker } from "@/components/DatePicker"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ServersideLookup } from "@/components/ServersideLookup"
import { cn } from "@/lib/utils"
import { useResourceMutation } from "@/lib/query"
import {
  ApiError,
  DAY_PORTIONS,
  api,
  type DayPortion,
  type EmployeeLookup,
  type LeaveRequestRow,
  type LeaveTypeLookup,
  type SaveLeaveRequestInput,
} from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"

export default function ApplyLeavePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const canApplyOnBehalf = useAuthStore((s) => s.hasPermission("leave.apply"))

  const [employee, setEmployee] = useState<EmployeeLookup | null>(null)
  const [leaveType, setLeaveType] = useState<LeaveTypeLookup | null>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [startPortion, setStartPortion] = useState<DayPortion>("Full")
  const [endPortion, setEndPortion] = useState<DayPortion>("Full")
  const [reason, setReason] = useState("")
  const [documentUrl, setDocumentUrl] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mutation = useResourceMutation<LeaveRequestRow, SaveLeaveRequestInput>(
    (data) => api.applyLeave(data),
    ["leave-requests", "leave-requests/mine", "leave-balances/mine"],
  )

  const singleDay = startDate !== "" && startDate === endDate
  const allowHalfDay = leaveType?.allowHalfDay ?? false
  const showPortions = allowHalfDay && startDate !== "" && endDate !== ""

  // Keep the half-day selections valid as the range/leave type changes: a range
  // can only be half on its first day (afternoon) or last day (morning); when
  // half-days aren't allowed everything resets to full days.
  useEffect(() => {
    if (!allowHalfDay) {
      setStartPortion("Full")
      setEndPortion("Full")
      return
    }
    if (singleDay) {
      setEndPortion("Full")
    } else {
      setStartPortion((p) => (p === "SecondHalf" ? "SecondHalf" : "Full"))
      setEndPortion((p) => (p === "FirstHalf" ? "FirstHalf" : "Full"))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleDay, allowHalfDay])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    if (!leaveType) {
      setErrors({ leaveTypeId: t("applyLeave.selectLeaveType") })
      return
    }
    try {
      await mutation.mutateAsync({
        employeeId: canApplyOnBehalf && employee ? employee.id : null,
        leaveTypeId: leaveType.id,
        startDate,
        endDate,
        startPortion,
        endPortion: singleDay ? startPortion : endPortion,
        reason: reason.trim(),
        documentUrl: documentUrl.trim() || null,
      })
      navigate(canApplyOnBehalf && employee ? "/leave-requests" : "/my-leave")
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors)
    }
  }

  return (
    <Page
      title={t("applyLeave.title")}
      icon={CalendarClock}
      description={t("applyLeave.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.leave") },
        { label: t("applyLeave.title") },
      ]}
      actions={
        <AppButton variant="outline" icon={ArrowLeft} onClick={() => navigate("/my-leave")}>
          {t("common.back")}
        </AppButton>
      }
    >
      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
        <FormSection title={t("applyLeave.details")} icon={CalendarClock}>
          {canApplyOnBehalf && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="employee">{t("applyLeave.employee")}</Label>
              <ServersideLookup<EmployeeLookup>
                id="employee"
                value={employee}
                onChange={(v) => setEmployee((v as EmployeeLookup | null) ?? null)}
                queryCallback={(term) => api.lookupEmployees(term)}
                optionLabel={(e) => `${e.fullName} (${e.employeeNumber})`}
                placeholder="applyLeave.employeePlaceholder"
              />
              <span className="text-xs text-muted-foreground">{t("applyLeave.employeeHint")}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="leaveType" required>
              {t("applyLeave.leaveType")}
            </Label>
            <ServersideLookup<LeaveTypeLookup>
              id="leaveType"
              value={leaveType}
              onChange={(v) => setLeaveType((v as LeaveTypeLookup | null) ?? null)}
              queryCallback={(term) => api.lookupLeaveTypes(term)}
              optionLabel={(lt) => `${lt.name} (${lt.code})`}
              placeholder="applyLeave.leaveTypePlaceholder"
            />
            {errors.leaveTypeId && (
              <span className="text-xs text-destructive">{errors.leaveTypeId}</span>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate" required>
                {t("applyLeave.startDate")}
              </Label>
              <DatePicker
                id="startDate"
                value={startDate}
                onChange={(v) => setStartDate(v)}
                clearable={false}
                aria-invalid={!!errors.startDate}
              />
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endDate" required>
                {t("applyLeave.endDate")}
              </Label>
              <DatePicker
                id="endDate"
                value={endDate}
                onChange={(v) => setEndDate(v)}
                min={startDate || undefined}
                clearable={false}
                aria-invalid={!!errors.endDate}
              />
              {errors.endDate && (
                <p className="text-xs text-destructive">{errors.endDate}</p>
              )}
            </div>
          </div>

          {showPortions && (
            singleDay ? (
              <div className="flex flex-col gap-2">
                <Label>{t("applyLeave.duration")}</Label>
                <div className="inline-flex w-full max-w-md overflow-hidden border">
                  {DAY_PORTIONS.map((p, i) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setStartPortion(p)}
                      className={cn(
                        "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                        i > 0 && "border-l",
                        startPortion === p
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      {t(`durationChoice.${p}`)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-4 border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{t("applyLeave.firstDayHalf")}</p>
                    <p className="text-xs text-muted-foreground">{t("applyLeave.firstDayHalfHint")}</p>
                  </div>
                  <Switch
                    checked={startPortion === "SecondHalf"}
                    onCheckedChange={(v) => setStartPortion(v ? "SecondHalf" : "Full")}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{t("applyLeave.lastDayHalf")}</p>
                    <p className="text-xs text-muted-foreground">{t("applyLeave.lastDayHalfHint")}</p>
                  </div>
                  <Switch
                    checked={endPortion === "FirstHalf"}
                    onCheckedChange={(v) => setEndPortion(v ? "FirstHalf" : "Full")}
                  />
                </div>
              </div>
            )
          )}

          <FormInput
            id="reason"
            label={t("applyLeave.reason")}
            required
            value={reason}
            onValueChange={(v) => setReason((v as string) ?? "")}
            error={errors.reason}
          />
          <FormInput
            id="documentUrl"
            label={t("applyLeave.documentUrl")}
            value={documentUrl}
            onValueChange={(v) => setDocumentUrl((v as string) ?? "")}
            hint={t("applyLeave.documentUrlHint")}
          />
        </FormSection>

        <div className="flex items-center justify-end">
          <AppButton type="submit" loading={mutation.isPending}>
            {t("applyLeave.submit")}
          </AppButton>
        </div>
      </form>
    </Page>
  )
}
