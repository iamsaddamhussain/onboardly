import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ClipboardCheck, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { FormSection } from "@/components/FormSection"
import { FormInput } from "@/components/FormInput"
import { FormSelect } from "@/components/FormSelect"
import { AppButton } from "@/components/AppButton"
import { ActionButton } from "@/components/ActionButton"
import { FormActions } from "@/components/FormActions"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ServersideLookup } from "@/components/ServersideLookup"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useResource, useResourceMutation } from "@/lib/query"
import { save, destroy } from "@/lib/resource"
import {
  ACCRUAL_METHODS,
  ApiError,
  api,
  type AccrualMethod,
  type LeavePolicyDetail,
  type LeaveTypeLookup,
  type SaveLeavePolicyInput,
} from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"

interface LineState {
  leaveTypeId: number
  leaveTypeName: string
  annualEntitlementDays: number
  accrualMethod: AccrualMethod
}

export default function LeavePolicyFormPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { id } = useParams()
  const editing = id != null
  const policyId = id ? Number(id) : null
  const invalidId = editing && (policyId == null || Number.isNaN(policyId))
  const canManage = useAuthStore((s) => s.hasPermission("leave.manage_policies"))

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [lines, setLines] = useState<LineState[]>([])
  const [code, setCode] = useState("")
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: existing, isLoading, isError } = useResource<LeavePolicyDetail>(
    `leave-policies/${policyId}`,
    {},
    { enabled: editing && !invalidId },
  )

  useEffect(() => {
    if (invalidId || isError) navigate("/leave-policies", { replace: true })
  }, [invalidId, isError, navigate])

  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setDescription(existing.description ?? "")
    setIsDefault(existing.isDefault)
    setIsActive(existing.isActive)
    setCode(existing.code)
    setLines(
      existing.lines.map((l) => ({
        leaveTypeId: l.leaveTypeId,
        leaveTypeName: l.leaveTypeName,
        annualEntitlementDays: l.annualEntitlementDays,
        accrualMethod: l.accrualMethod,
      })),
    )
    setDirty(false)
  }, [existing])

  const mutation = useResourceMutation<LeavePolicyDetail, SaveLeavePolicyInput>(
    (data) => save<LeavePolicyDetail>("leave-policies", policyId, data),
    ["leave-policies"],
  )
  const deleteMutation = useResourceMutation<void, number>(
    (pid) => destroy("leave-policies", pid),
    ["leave-policies"],
  )

  function addLine(lt: LeaveTypeLookup | null) {
    if (!lt) return
    if (lines.some((l) => l.leaveTypeId === lt.id)) return
    setLines((prev) => [
      ...prev,
      { leaveTypeId: lt.id, leaveTypeName: lt.name, annualEntitlementDays: 0, accrualMethod: "Immediate" },
    ])
    setDirty(true)
  }

  function updateLine(leaveTypeId: number, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l) => (l.leaveTypeId === leaveTypeId ? { ...l, ...patch } : l)))
    setDirty(true)
  }

  function removeLine(leaveTypeId: number) {
    setLines((prev) => prev.filter((l) => l.leaveTypeId !== leaveTypeId))
    setDirty(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    try {
      await mutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        isDefault,
        isActive,
        lines: lines.map((l) => ({
          leaveTypeId: l.leaveTypeId,
          annualEntitlementDays: l.annualEntitlementDays,
          accrualMethod: l.accrualMethod,
        })),
      })
      navigate("/leave-policies")
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors)
    }
  }

  function requestLeave() {
    if (dirty) setConfirmOpen(true)
    else navigate("/leave-policies")
  }

  async function handleDelete() {
    if (policyId == null) return
    await deleteMutation.mutateAsync(policyId)
    setDeleteOpen(false)
    navigate("/leave-policies")
  }

  return (
    <Page
      title={editing ? t("leavePolicyForm.editTitle") : t("leavePolicyForm.newTitle")}
      icon={ClipboardCheck}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.leavePolicies"), to: "/leave-policies" },
        { label: editing ? t("leavePolicyForm.editTitle") : t("leavePolicyForm.newTitle") },
      ]}
      loading={editing && isLoading}
      actions={
        <AppButton variant="outline" icon={ArrowLeft} onClick={requestLeave}>
          {t("common.back")}
        </AppButton>
      }
    >
      <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-4">
        <FormSection title={t("leavePolicyForm.details")} icon={ClipboardCheck}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput
              id="name"
              label={t("leavePolicyForm.name")}
              required
              value={name}
              onValueChange={(v) => {
                setName((v as string) ?? "")
                setDirty(true)
              }}
              error={errors.name}
            />
            {editing && (
              <FormInput
                id="code"
                label={t("leavePolicyForm.code")}
                value={code}
                onValueChange={() => undefined}
                readOnly
                hint={t("common.autoGenerated")}
              />
            )}
          </div>
          <FormInput
            id="description"
            label={t("leavePolicyForm.description")}
            value={description}
            onValueChange={(v) => {
              setDescription((v as string) ?? "")
              setDirty(true)
            }}
          />
          <div className="flex flex-col divide-y border-t">
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <Label htmlFor="isDefault">{t("leavePolicyForm.isDefault")}</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("leavePolicyForm.isDefaultHint")}
                </p>
              </div>
              <Switch
                id="isDefault"
                checked={isDefault}
                onCheckedChange={(v) => {
                  setIsDefault(v)
                  setDirty(true)
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <Label htmlFor="isActive">{t("leavePolicyForm.isActive")}</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("leavePolicyForm.isActiveHint")}
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={(v) => {
                  setIsActive(v)
                  setDirty(true)
                }}
              />
            </div>
          </div>
        </FormSection>

        <FormSection title={t("leavePolicyForm.leaveTypes")} icon={Plus}>
          <div className="flex flex-col gap-3">
            <div className="max-w-sm">
              <Label className="mb-2 block">{t("leavePolicyForm.addLeaveType")}</Label>
              <ServersideLookup<LeaveTypeLookup>
                id="add-leave-type"
                value={null}
                onChange={(v) => addLine((v as LeaveTypeLookup | null) ?? null)}
                queryCallback={(term) => api.lookupLeaveTypes(term)}
                optionLabel={(lt) => `${lt.name} (${lt.code})`}
                placeholder="leavePolicyForm.addLeaveTypePlaceholder"
              />
            </div>

            {lines.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">{t("leavePolicyForm.noLines")}</p>
            ) : (
              <div className="overflow-x-auto border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t("leavePolicyForm.leaveType")}</th>
                      <th className="px-3 py-2 font-medium">{t("leavePolicyForm.entitlement")}</th>
                      <th className="px-3 py-2 font-medium">{t("leavePolicyForm.accrual")}</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.leaveTypeId} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{line.leaveTypeName}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={line.annualEntitlementDays}
                            onChange={(e) =>
                              updateLine(line.leaveTypeId, {
                                annualEntitlementDays: Number(e.target.value),
                              })
                            }
                            className="w-24 border px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <FormSelect
                            id={`accrual-${line.leaveTypeId}`}
                            value={line.accrualMethod}
                            onValueChange={(v) =>
                              updateLine(line.leaveTypeId, {
                                accrualMethod: (v as AccrualMethod) ?? "Immediate",
                              })
                            }
                            options={ACCRUAL_METHODS.map((a) => ({
                              value: a,
                              label: t(`accrualMethod.${a}`),
                            }))}
                            className="w-40"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <ActionButton icon={Trash2} onClick={() => removeLine(line.leaveTypeId)}>
                            {t("common.remove")}
                          </ActionButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </FormSection>

        <FormActions
          editing={editing}
          onCancel={requestLeave}
          saving={mutation.isPending}
          showDelete={editing && canManage}
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
          navigate("/leave-policies")
        }}
        onCancel={() => setConfirmOpen(false)}
      />
      <ConfirmDialog
        open={deleteOpen}
        title={t("leavePolicyForm.deleteTitle")}
        description={t("leavePolicyForm.deleteDescription")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </Page>
  )
}
