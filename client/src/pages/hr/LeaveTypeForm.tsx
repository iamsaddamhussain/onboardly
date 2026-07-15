import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, CalendarCheck, FileText, Settings2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { FormSection } from "@/components/FormSection"
import { FormInput } from "@/components/FormInput"
import { FormSelect } from "@/components/FormSelect"
import { AppButton } from "@/components/AppButton"
import { FormActions } from "@/components/FormActions"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useResource, useResourceMutation } from "@/lib/query"
import { save, destroy } from "@/lib/resource"
import {
  ApiError,
  GENDER_RESTRICTIONS,
  type GenderRestriction,
  type LeaveTypeRow,
  type SaveLeaveTypeInput,
} from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"

const empty: SaveLeaveTypeInput = {
  name: "",
  color: "#2563eb",
  isPaid: true,
  countsTowardAttendance: false,
  countsTowardPayroll: true,
  requiresApproval: true,
  canAttachDocument: false,
  documentRequiredAfterDays: null,
  minDurationDays: 1,
  maxDurationDays: null,
  allowHalfDay: true,
  allowHourly: false,
  futureOnly: false,
  allowPastDays: true,
  canCarryForward: false,
  maxCarryForwardDays: null,
  carryForwardExpiryDays: null,
  canEncash: false,
  genderRestriction: "Any",
  restrictedDuringProbation: false,
  isActive: true,
}

// A labelled toggle row reused across the configuration sections.
function ToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: ReactNode
  hint?: ReactNode
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="flex flex-col">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export default function LeaveTypeFormPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { id } = useParams()
  const editing = id != null
  const leaveTypeId = id ? Number(id) : null
  const invalidId = editing && (leaveTypeId == null || Number.isNaN(leaveTypeId))
  const canDelete = useAuthStore((s) => s.hasPermission("leave.manage_types"))

  const [form, setForm] = useState<SaveLeaveTypeInput>(empty)
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [code, setCode] = useState("")

  const { data: existing, isLoading, isError } = useResource<LeaveTypeRow>(
    `leave-types/${leaveTypeId}`,
    {},
    { enabled: editing && !invalidId },
  )

  useEffect(() => {
    if (invalidId || isError) navigate("/leave-types", { replace: true })
  }, [invalidId, isError, navigate])

  // The list row doesn't carry every config flag, so only the fields it exposes
  // are hydrated; the rest keep their sensible defaults until edited. A detail
  // endpoint can enrich this later without changing the form.
  useEffect(() => {
    if (!existing) return
    setForm((prev) => ({
      ...prev,
      name: existing.name,
      color: existing.color,
      isPaid: existing.isPaid,
      requiresApproval: existing.requiresApproval,
      allowHalfDay: existing.allowHalfDay,
      minDurationDays: existing.minDurationDays,
      maxDurationDays: existing.maxDurationDays,
      genderRestriction: existing.genderRestriction,
      isActive: existing.isActive,
    }))
    setCode(existing.code)
    setDirty(false)
  }, [existing])

  const mutation = useResourceMutation<LeaveTypeRow, SaveLeaveTypeInput>(
    (data) => save<LeaveTypeRow>("leave-types", leaveTypeId, data),
    ["leave-types"],
  )

  const deleteMutation = useResourceMutation<void, number>(
    (tid) => destroy("leave-types", tid),
    ["leave-types"],
  )

  function update<K extends keyof SaveLeaveTypeInput>(key: K, value: SaveLeaveTypeInput[K]) {
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
    try {
      await mutation.mutateAsync({ ...form, name: form.name.trim() })
      navigate("/leave-types")
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors)
    }
  }

  function requestLeave() {
    if (dirty) setConfirmOpen(true)
    else navigate("/leave-types")
  }

  async function handleDelete() {
    if (leaveTypeId == null) return
    await deleteMutation.mutateAsync(leaveTypeId)
    setDeleteOpen(false)
    navigate("/leave-types")
  }

  return (
    <Page
      title={editing ? t("leaveTypeForm.editTitle") : t("leaveTypeForm.newTitle")}
      icon={CalendarCheck}
      description={editing ? t("leaveTypeForm.editDescription") : t("leaveTypeForm.newDescription")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.leaveTypes"), to: "/leave-types" },
        { label: editing ? t("leaveTypeForm.editTitle") : t("leaveTypeForm.newTitle") },
      ]}
      loading={editing && isLoading}
      actions={
        <AppButton variant="outline" icon={ArrowLeft} onClick={requestLeave}>
          {t("common.back")}
        </AppButton>
      }
    >
      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
        <FormSection title={t("leaveTypeForm.details")} icon={CalendarCheck}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput
              id="name"
              label={t("leaveTypeForm.name")}
              required
              value={form.name}
              onValueChange={(v) => update("name", (v as string) ?? "")}
              error={errors.name}
            />
            {editing && (
              <FormInput
                id="code"
                label={t("leaveTypeForm.code")}
                value={code}
                onValueChange={() => undefined}
                readOnly
                hint={t("common.autoGenerated")}
              />
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="color">{t("leaveTypeForm.color")}</Label>
              <input
                id="color"
                type="color"
                value={form.color}
                onChange={(e) => update("color", e.target.value)}
                className="h-10 w-20 cursor-pointer rounded-none border"
              />
            </div>
            <FormSelect
              id="genderRestriction"
              label={t("leaveTypeForm.genderRestriction")}
              value={form.genderRestriction}
              onValueChange={(v) => update("genderRestriction", (v as GenderRestriction) ?? "Any")}
              options={GENDER_RESTRICTIONS.map((g) => ({
                value: g,
                label: t(`leaveTypeForm.gender.${g}`),
              }))}
            />
          </div>
        </FormSection>

        <FormSection title={t("leaveTypeForm.rules")} icon={Settings2}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput
              id="minDurationDays"
              type="number"
              min={0}
              step="any"
              label={t("leaveTypeForm.minDuration")}
              value={form.minDurationDays}
              onValueChange={(v) => update("minDurationDays", (v as number) ?? 0)}
              error={errors.minDurationDays}
            />
            <FormInput
              id="maxDurationDays"
              type="number"
              min={0}
              step="any"
              label={t("leaveTypeForm.maxDuration")}
              value={form.maxDurationDays}
              onValueChange={(v) => update("maxDurationDays", (v as number) ?? null)}
              hint={t("leaveTypeForm.maxDurationHint")}
            />
          </div>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <ToggleRow
              label={t("leaveTypeForm.isPaid")}
              checked={form.isPaid}
              onCheckedChange={(v) => update("isPaid", v)}
            />
            <ToggleRow
              label={t("leaveTypeForm.requiresApproval")}
              checked={form.requiresApproval}
              onCheckedChange={(v) => update("requiresApproval", v)}
            />
            <ToggleRow
              label={t("leaveTypeForm.countsTowardAttendance")}
              checked={form.countsTowardAttendance}
              onCheckedChange={(v) => update("countsTowardAttendance", v)}
            />
            <ToggleRow
              label={t("leaveTypeForm.countsTowardPayroll")}
              checked={form.countsTowardPayroll}
              onCheckedChange={(v) => update("countsTowardPayroll", v)}
            />
            <ToggleRow
              label={t("leaveTypeForm.allowHalfDay")}
              checked={form.allowHalfDay}
              onCheckedChange={(v) => update("allowHalfDay", v)}
            />
            <ToggleRow
              label={t("leaveTypeForm.allowHourly")}
              checked={form.allowHourly}
              onCheckedChange={(v) => update("allowHourly", v)}
            />
            <ToggleRow
              label={t("leaveTypeForm.futureOnly")}
              checked={form.futureOnly}
              onCheckedChange={(v) => update("futureOnly", v)}
            />
            <ToggleRow
              label={t("leaveTypeForm.allowPastDays")}
              checked={form.allowPastDays}
              onCheckedChange={(v) => update("allowPastDays", v)}
            />
            <ToggleRow
              label={t("leaveTypeForm.restrictedDuringProbation")}
              checked={form.restrictedDuringProbation}
              onCheckedChange={(v) => update("restrictedDuringProbation", v)}
            />
            <ToggleRow
              label={t("leaveTypeForm.isActive")}
              checked={form.isActive}
              onCheckedChange={(v) => update("isActive", v)}
            />
          </div>
        </FormSection>

        <FormSection title={t("leaveTypeForm.documentsCarry")} icon={FileText}>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <ToggleRow
              label={t("leaveTypeForm.canAttachDocument")}
              checked={form.canAttachDocument}
              onCheckedChange={(v) => update("canAttachDocument", v)}
            />
            <ToggleRow
              label={t("leaveTypeForm.canCarryForward")}
              checked={form.canCarryForward}
              onCheckedChange={(v) => update("canCarryForward", v)}
            />
            <ToggleRow
              label={t("leaveTypeForm.canEncash")}
              checked={form.canEncash}
              onCheckedChange={(v) => update("canEncash", v)}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {form.canAttachDocument && (
              <FormInput
                id="documentRequiredAfterDays"
                type="number"
                min={0}
                label={t("leaveTypeForm.documentRequiredAfterDays")}
                value={form.documentRequiredAfterDays}
                onValueChange={(v) => update("documentRequiredAfterDays", (v as number) ?? null)}
                hint={t("leaveTypeForm.documentRequiredAfterDaysHint")}
              />
            )}
            {form.canCarryForward && (
              <>
                <FormInput
                  id="maxCarryForwardDays"
                  type="number"
                  min={0}
                  step="any"
                  label={t("leaveTypeForm.maxCarryForwardDays")}
                  value={form.maxCarryForwardDays}
                  onValueChange={(v) => update("maxCarryForwardDays", (v as number) ?? null)}
                />
                <FormInput
                  id="carryForwardExpiryDays"
                  type="number"
                  min={0}
                  label={t("leaveTypeForm.carryForwardExpiryDays")}
                  value={form.carryForwardExpiryDays}
                  onValueChange={(v) => update("carryForwardExpiryDays", (v as number) ?? null)}
                  hint={t("leaveTypeForm.carryForwardExpiryDaysHint")}
                />
              </>
            )}
          </div>
        </FormSection>

        <FormActions
          editing={editing}
          onCancel={requestLeave}
          saving={mutation.isPending}
          showDelete={editing && canDelete}
          onDelete={() => setDeleteOpen(true)}
        />
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
          navigate("/leave-types")
        }}
        onCancel={() => setConfirmOpen(false)}
      />
      <ConfirmDialog
        open={deleteOpen}
        title={t("leaveTypeForm.deleteTitle")}
        description={t("leaveTypeForm.deleteDescription")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </Page>
  )
}
