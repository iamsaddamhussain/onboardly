import { useMemo, useState, type FormEvent } from "react"
import { LayoutDashboard, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { Card } from "@/components/ui/card"
import { FormSection } from "@/components/FormSection"
import { FormInput } from "@/components/FormInput"
import { FormSelect } from "@/components/FormSelect"
import { AppButton } from "@/components/AppButton"
import { Label } from "@/components/ui/label"
import { ServersideLookup } from "@/components/ServersideLookup"
import { useResource, useResourceMutation } from "@/lib/query"
import {
  ApiError,
  LEAVE_LEDGER_TYPES,
  api,
  type AdjustLeaveBalanceInput,
  type EmployeeLookup,
  type LeaveBalanceSummary,
  type LeaveLedgerType,
  type LeaveTypeLookup,
} from "@/lib/api"

export default function LeaveBalancesPage() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  const [employee, setEmployee] = useState<EmployeeLookup | null>(null)
  const [year, setYear] = useState<string>(String(currentYear))

  // Adjustment form state.
  const [adjLeaveType, setAdjLeaveType] = useState<LeaveTypeLookup | null>(null)
  const [adjType, setAdjType] = useState<LeaveLedgerType>("Opening")
  const [days, setDays] = useState<number>(0)
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const employeeId = employee?.id ?? null
  const balancesKey = employeeId != null ? `leave-balances/employee/${employeeId}` : ""

  const { data: balances } = useResource<LeaveBalanceSummary[]>(
    balancesKey,
    { year: Number(year) },
    { enabled: employeeId != null },
  )

  const adjustMutation = useResourceMutation<{ id: number }, AdjustLeaveBalanceInput>(
    (data) => api.adjustLeaveBalance(data),
    [balancesKey],
  )

  const yearOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = []
    for (let y = currentYear + 1; y >= currentYear - 3; y--)
      opts.push({ value: String(y), label: String(y) })
    return opts
  }, [currentYear])

  async function handleAdjust(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    if (employeeId == null || !adjLeaveType) {
      setErrors({ form: t("leaveBalances.selectEmployeeAndType") })
      return
    }
    try {
      await adjustMutation.mutateAsync({
        employeeId,
        leaveTypeId: adjLeaveType.id,
        year: Number(year),
        type: adjType,
        days,
        notes: notes.trim() || null,
      })
      setDays(0)
      setNotes("")
      setAdjLeaveType(null)
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors)
    }
  }

  return (
    <Page
      title={t("leaveBalances.title")}
      icon={LayoutDashboard}
      description={t("leaveBalances.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.leave") },
        { label: t("nav.leaveBalances") },
      ]}
    >
      <div className="flex flex-col gap-4">
        <Card className="flex-row flex-wrap items-end gap-4 rounded-none p-4">
          <div className="flex min-w-64 flex-1 flex-col gap-2">
            <Label>{t("leaveBalances.employee")}</Label>
            <ServersideLookup<EmployeeLookup>
              id="employee"
              value={employee}
              onChange={(v) => setEmployee((v as EmployeeLookup | null) ?? null)}
              queryCallback={(term) => api.lookupEmployees(term)}
              optionLabel={(e) => `${e.fullName} (${e.employeeNumber})`}
              placeholder="leaveBalances.employeePlaceholder"
            />
          </div>
          <FormSelect
            id="year"
            label={t("leaveBalances.year")}
            value={year}
            onValueChange={(v) => setYear((v as string) ?? String(currentYear))}
            options={yearOptions}
            className="w-40"
          />
        </Card>

        {employeeId != null && (
          <Card className="overflow-hidden rounded-none p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("leaveBalances.columns.type")}</th>
                    <th className="px-4 py-3 font-medium">{t("leaveBalances.columns.entitlement")}</th>
                    <th className="px-4 py-3 font-medium">{t("leaveBalances.columns.used")}</th>
                    <th className="px-4 py-3 font-medium">{t("leaveBalances.columns.adjustment")}</th>
                    <th className="px-4 py-3 font-medium">{t("leaveBalances.columns.carriedForward")}</th>
                    <th className="px-4 py-3 font-medium">{t("leaveBalances.columns.expired")}</th>
                    <th className="px-4 py-3 font-medium">{t("leaveBalances.columns.remaining")}</th>
                  </tr>
                </thead>
                <tbody>
                  {balances && balances.length > 0 ? (
                    balances.map((b) => (
                      <tr key={b.leaveTypeId} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2 font-medium">
                            <span
                              className="inline-block size-3 shrink-0 rounded-full"
                              style={{ backgroundColor: b.leaveTypeColor }}
                            />
                            {b.leaveTypeName}
                          </span>
                        </td>
                        <td className="px-4 py-3">{b.entitlement}</td>
                        <td className="px-4 py-3">{b.used}</td>
                        <td className="px-4 py-3">{b.adjustment}</td>
                        <td className="px-4 py-3">{b.carriedForward}</td>
                        <td className="px-4 py-3">{b.expired}</td>
                        <td className="px-4 py-3 font-semibold">{b.remaining}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                        {t("leaveBalances.empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {employeeId != null && (
          <form onSubmit={handleAdjust} className="max-w-2xl">
            <FormSection title={t("leaveBalances.adjustTitle")} icon={Plus}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label required>{t("leaveBalances.leaveType")}</Label>
                  <ServersideLookup<LeaveTypeLookup>
                    id="adj-leave-type"
                    value={adjLeaveType}
                    onChange={(v) => setAdjLeaveType((v as LeaveTypeLookup | null) ?? null)}
                    queryCallback={(term) => api.lookupLeaveTypes(term)}
                    optionLabel={(lt) => `${lt.name} (${lt.code})`}
                    placeholder="leaveBalances.leaveTypePlaceholder"
                  />
                </div>
                <FormSelect
                  id="adj-type"
                  label={t("leaveBalances.movementType")}
                  value={adjType}
                  onValueChange={(v) => setAdjType((v as LeaveLedgerType) ?? "Opening")}
                  options={LEAVE_LEDGER_TYPES.map((l) => ({
                    value: l,
                    label: t(`leaveLedgerType.${l}`),
                  }))}
                />
                <FormInput
                  id="days"
                  type="number"
                  step="any"
                  label={t("leaveBalances.days")}
                  value={days}
                  onValueChange={(v) => setDays((v as number) ?? 0)}
                  hint={t("leaveBalances.daysHint")}
                  error={errors.days}
                />
                <FormInput
                  id="notes"
                  label={t("leaveBalances.notes")}
                  value={notes}
                  onValueChange={(v) => setNotes((v as string) ?? "")}
                />
              </div>
              {errors.form && <p className="text-xs text-destructive">{errors.form}</p>}
              <div className="flex justify-end">
                <AppButton type="submit" loading={adjustMutation.isPending}>
                  {t("leaveBalances.record")}
                </AppButton>
              </div>
            </FormSection>
          </form>
        )}
      </div>
    </Page>
  )
}
