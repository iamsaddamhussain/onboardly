import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Briefcase, IdCard, Trash2, UserRound, UsersRound } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { FormSection } from "@/components/FormSection"
import { FormInput } from "@/components/FormInput"
import { FormSelect } from "@/components/FormSelect"
import { ServersideLookup } from "@/components/ServersideLookup"
import { AppButton } from "@/components/AppButton"
import { DatePicker } from "@/components/DatePicker"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useResource, useResourceMutation } from "@/lib/query"
import { save, destroy } from "@/lib/resource"
import {
  ApiError,
  api,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  type AssignableUser,
  type DepartmentLookup,
  type EmployeeDetail,
  type EmployeeLookup,
  type JobTitleLookup,
} from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"

const empty = {
  userId: null as number | null,
  departmentId: null as number | null,
  jobTitleId: null as number | null,
  reportingManagerId: null as number | null,
  joiningDate: "",
  employmentStatus: "Active",
  employmentType: "FullTime",
  workEmail: "",
  workPhone: "",
  notes: "",
}

type FormState = typeof empty

export default function EmployeeFormPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { id } = useParams()
  const editing = id != null
  const employeeId = id ? Number(id) : null
  const invalidId = editing && (employeeId == null || Number.isNaN(employeeId))
  const canDelete = useAuthStore((s) => s.hasPermission("employees.delete"))

  const [form, setForm] = useState<FormState>(empty)
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [user, setUser] = useState<AssignableUser | null>(null)
  const [department, setDepartment] = useState<DepartmentLookup | null>(null)
  const [jobTitle, setJobTitle] = useState<JobTitleLookup | null>(null)
  const [manager, setManager] = useState<EmployeeLookup | null>(null)
  const [employeeNumber, setEmployeeNumber] = useState<string>("")

  const { data: existing, isLoading, isError } = useResource<EmployeeDetail>(
    `employees/${employeeId}`,
    {},
    { enabled: editing && !invalidId },
  )

  useEffect(() => {
    if (invalidId || isError) navigate("/employees", { replace: true })
  }, [invalidId, isError, navigate])

  useEffect(() => {
    if (!existing) return
    setForm({
      userId: existing.userId,
      departmentId: existing.departmentId,
      jobTitleId: existing.jobTitleId,
      reportingManagerId: existing.reportingManagerId,
      joiningDate: existing.joiningDate.slice(0, 10),
      employmentStatus: existing.employmentStatus,
      employmentType: existing.employmentType,
      workEmail: existing.workEmail ?? "",
      workPhone: existing.workPhone ?? "",
      notes: existing.notes ?? "",
    })
    setEmployeeNumber(existing.employeeNumber)
    setUser({ id: existing.userId, fullName: existing.fullName, email: existing.email })
    setDepartment(
      existing.departmentId != null
        ? { id: existing.departmentId, name: existing.departmentName ?? "", code: "" }
        : null,
    )
    setJobTitle(
      existing.jobTitleId != null
        ? { id: existing.jobTitleId, name: existing.jobTitleName ?? "", code: "" }
        : null,
    )
    setManager(
      existing.reportingManagerId != null
        ? { id: existing.reportingManagerId, fullName: existing.reportingManagerName ?? "", employeeNumber: "" }
        : null,
    )
    setDirty(false)
  }, [existing])

  const mutation = useResourceMutation<EmployeeDetail, FormState>(
    (data) =>
      save<EmployeeDetail>("employees", employeeId, {
        userId: data.userId,
        departmentId: data.departmentId,
        jobTitleId: data.jobTitleId,
        reportingManagerId: data.reportingManagerId,
        joiningDate: data.joiningDate,
        employmentStatus: data.employmentStatus,
        employmentType: data.employmentType,
        workEmail: data.workEmail.trim() || null,
        workPhone: data.workPhone.trim() || null,
        notes: data.notes.trim() || null,
      }),
    ["employees"],
  )

  const deleteMutation = useResourceMutation<void, number>(
    (eid) => destroy("employees", eid),
    ["employees"],
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
    try {
      const saved = await mutation.mutateAsync(form)
      navigate(`/employees/${saved.id}`)
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors)
    }
  }

  function requestLeave() {
    if (dirty) setConfirmOpen(true)
    else navigate("/employees")
  }

  async function handleDelete() {
    if (employeeId == null) return
    await deleteMutation.mutateAsync(employeeId)
    setDeleteOpen(false)
    navigate("/employees")
  }

  return (
    <Page
      title={editing ? t("employeeForm.editTitle") : t("employeeForm.newTitle")}
      icon={UsersRound}
      description={editing ? t("employeeForm.editDescription") : t("employeeForm.newDescription")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.employees"), to: "/employees" },
        { label: editing ? t("employeeForm.editTitle") : t("employeeForm.newTitle") },
      ]}
      loading={editing && isLoading}
      actions={
        <AppButton variant="outline" icon={ArrowLeft} onClick={requestLeave}>
          {t("common.back")}
        </AppButton>
      }
    >
      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
        <FormSection title={t("employeeForm.identity")} icon={IdCard}>
          {editing && (
            <FormInput
              id="employeeNumber"
              label={t("employeeForm.employeeNumber")}
              value={employeeNumber}
              onValueChange={() => undefined}
              readOnly
            />
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="user" required={!editing}>
              {t("employeeForm.user")}
            </Label>
            <ServersideLookup<AssignableUser>
              id="user"
              value={user}
              disabled={editing}
              onChange={(value) => {
                const u = (value as AssignableUser | null) ?? null
                setUser(u)
                update("userId", u ? u.id : null)
              }}
              queryCallback={(term) => api.lookupAssignableUsers(term)}
              optionLabel={(u) => `${u.fullName} — ${u.email}`}
              placeholder="employeeForm.userPlaceholder"
              aria-invalid={!!errors.userId}
            />
            {errors.userId ? (
              <p className="text-xs text-destructive">{errors.userId}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {editing ? t("employeeForm.userLockedHint") : t("employeeForm.userHint")}
              </p>
            )}
          </div>
        </FormSection>

        <FormSection title={t("employeeForm.employment")} icon={Briefcase}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="joiningDate" required>
                {t("employeeForm.joiningDate")}
              </Label>
              <DatePicker
                id="joiningDate"
                value={form.joiningDate}
                onChange={(v) => update("joiningDate", v)}
                clearable={false}
                aria-invalid={!!errors.joiningDate}
              />
              {errors.joiningDate && (
                <p className="text-xs text-destructive">{errors.joiningDate}</p>
              )}
            </div>

            <FormSelect
              id="employmentStatus"
              label={t("employeeForm.status")}
              required
              value={form.employmentStatus}
              onValueChange={(v) => update("employmentStatus", (v as string) ?? "Active")}
              options={EMPLOYMENT_STATUSES.map((s) => ({
                value: s,
                label: t(`employment.status.${s}`),
              }))}
              error={errors.employmentStatus}
            />

            <FormSelect
              id="employmentType"
              label={t("employeeForm.type")}
              required
              value={form.employmentType}
              onValueChange={(v) => update("employmentType", (v as string) ?? "FullTime")}
              options={EMPLOYMENT_TYPES.map((ty) => ({
                value: ty,
                label: t(`employment.type.${ty}`),
              }))}
              error={errors.employmentType}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="department">{t("employeeForm.department")}</Label>
            <ServersideLookup<DepartmentLookup>
              id="department"
              value={department}
              onChange={(value) => {
                const d = (value as DepartmentLookup | null) ?? null
                setDepartment(d)
                update("departmentId", d ? d.id : null)
              }}
              queryCallback={(term) => api.lookupDepartments(term)}
              optionLabel={(d) => d.name}
              placeholder="employeeForm.departmentPlaceholder"
              aria-invalid={!!errors.departmentId}
            />
            {errors.departmentId && <p className="text-xs text-destructive">{errors.departmentId}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="jobTitle">{t("employeeForm.jobTitle")}</Label>
            <ServersideLookup<JobTitleLookup>
              id="jobTitle"
              value={jobTitle}
              onChange={(value) => {
                const j = (value as JobTitleLookup | null) ?? null
                setJobTitle(j)
                update("jobTitleId", j ? j.id : null)
              }}
              queryCallback={(term) => api.lookupJobTitles(term)}
              optionLabel={(j) => j.name}
              placeholder="employeeForm.jobTitlePlaceholder"
              aria-invalid={!!errors.jobTitleId}
            />
            {errors.jobTitleId && <p className="text-xs text-destructive">{errors.jobTitleId}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="manager">{t("employeeForm.manager")}</Label>
            <ServersideLookup<EmployeeLookup>
              id="manager"
              value={manager}
              onChange={(value) => {
                const m = (value as EmployeeLookup | null) ?? null
                setManager(m)
                update("reportingManagerId", m ? m.id : null)
              }}
              queryCallback={(term) => api.lookupEmployees(term, employeeId ?? undefined)}
              optionLabel={(e) => `${e.fullName} (${e.employeeNumber})`}
              placeholder="employeeForm.managerPlaceholder"
              aria-invalid={!!errors.reportingManagerId}
            />
            {errors.reportingManagerId ? (
              <p className="text-xs text-destructive">{errors.reportingManagerId}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("employeeForm.managerHint")}</p>
            )}
          </div>
        </FormSection>

        <FormSection title={t("employeeForm.contact")} icon={UserRound}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput
              id="workEmail"
              type="email"
              label={t("employeeForm.workEmail")}
              value={form.workEmail}
              onValueChange={(v) => update("workEmail", (v as string) ?? "")}
              error={errors.workEmail}
            />
            <FormInput
              id="workPhone"
              type="tel"
              label={t("employeeForm.workPhone")}
              value={form.workPhone}
              onValueChange={(v) => update("workPhone", (v as string) ?? "")}
              error={errors.workPhone}
            />
          </div>

          <FormInput
            id="notes"
            type="textarea"
            rows={3}
            label={t("employeeForm.notes")}
            value={form.notes}
            onValueChange={(v) => update("notes", (v as string) ?? "")}
            error={errors.notes}
          />
        </FormSection>

        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="outline" onClick={requestLeave}>
            {t("common.cancel")}
          </AppButton>
          {editing && canDelete && (
            <AppButton
              type="button"
              variant="destructive"
              icon={Trash2}
              onClick={() => setDeleteOpen(true)}
            >
              {t("common.delete")}
            </AppButton>
          )}
          <AppButton
            type="submit"
            loading={mutation.isPending}
            loadingText={editing ? t("common.saving") : t("common.creating")}
          >
            {editing ? t("common.saveChanges") : t("employeeForm.create")}
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
          navigate("/employees")
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={t("employeeForm.deleteTitle")}
        description={t("employeeForm.deleteDescription")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </Page>
  )
}
