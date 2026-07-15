import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Network, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { FormSection } from "@/components/FormSection"
import { FormInput } from "@/components/FormInput"
import { ServersideLookup } from "@/components/ServersideLookup"
import { AppButton } from "@/components/AppButton"
import { FormActions } from "@/components/FormActions"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useResource, useResourceMutation } from "@/lib/query"
import { save, destroy } from "@/lib/resource"
import {
  ApiError,
  api,
  type DepartmentRow,
  type DepartmentLookup,
  type EmployeeLookup,
} from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"

const empty = {
  name: "",
  description: "",
  parentDepartmentId: null as number | null,
  managerEmployeeId: null as number | null,
  isActive: true,
}

type FormState = typeof empty

export default function DepartmentFormPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { id } = useParams()
  const editing = id != null
  const departmentId = id ? Number(id) : null
  const invalidId = editing && (departmentId == null || Number.isNaN(departmentId))
  const canDelete = useAuthStore((s) => s.hasPermission("departments.delete"))

  const [form, setForm] = useState<FormState>(empty)
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [parent, setParent] = useState<DepartmentLookup | null>(null)
  const [manager, setManager] = useState<EmployeeLookup | null>(null)
  const [code, setCode] = useState<string>("")

  const { data: existing, isLoading, isError } = useResource<DepartmentRow>(
    `departments/${departmentId}`,
    {},
    { enabled: editing && !invalidId },
  )

  useEffect(() => {
    if (invalidId || isError) navigate("/departments", { replace: true })
  }, [invalidId, isError, navigate])

  useEffect(() => {
    if (!existing) return
    setForm({
      name: existing.name,
      description: existing.description ?? "",
      parentDepartmentId: existing.parentDepartmentId,
      managerEmployeeId: existing.managerEmployeeId,
      isActive: existing.isActive,
    })
    setCode(existing.code)
    setParent(
      existing.parentDepartmentId != null
        ? { id: existing.parentDepartmentId, name: existing.parentDepartmentName ?? "", code: "" }
        : null,
    )
    setManager(
      existing.managerEmployeeId != null
        ? { id: existing.managerEmployeeId, fullName: existing.managerName ?? "", employeeNumber: "" }
        : null,
    )
    setDirty(false)
  }, [existing])

  const mutation = useResourceMutation<DepartmentRow, FormState>(
    (data) =>
      save<DepartmentRow>("departments", departmentId, {
        name: data.name.trim(),
        description: data.description.trim() || null,
        parentDepartmentId: data.parentDepartmentId,
        managerEmployeeId: data.managerEmployeeId,
        isActive: data.isActive,
      }),
    ["departments"],
  )

  const deleteMutation = useResourceMutation<void, number>(
    (did) => destroy("departments", did),
    ["departments"],
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
      await mutation.mutateAsync(form)
      navigate("/departments")
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors)
    }
  }

  function requestLeave() {
    if (dirty) setConfirmOpen(true)
    else navigate("/departments")
  }

  async function handleDelete() {
    if (departmentId == null) return
    await deleteMutation.mutateAsync(departmentId)
    setDeleteOpen(false)
    navigate("/departments")
  }

  return (
    <Page
      title={editing ? t("departmentForm.editTitle") : t("departmentForm.newTitle")}
      icon={Network}
      description={editing ? t("departmentForm.editDescription") : t("departmentForm.newDescription")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.departments"), to: "/departments" },
        { label: editing ? t("departmentForm.editTitle") : t("departmentForm.newTitle") },
      ]}
      loading={editing && isLoading}
      actions={
        <AppButton variant="outline" icon={ArrowLeft} onClick={requestLeave}>
          {t("common.back")}
        </AppButton>
      }
    >
      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
        <FormSection title={t("departmentForm.details")} icon={Network}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput
              id="name"
              label={t("departmentForm.name")}
              required
              value={form.name}
              onValueChange={(v) => update("name", (v as string) ?? "")}
              error={errors.name}
            />
            {editing && (
              <FormInput
                id="code"
                label={t("departmentForm.code")}
                value={code}
                onValueChange={() => undefined}
                readOnly
                hint={t("common.autoGenerated")}
              />
            )}
          </div>

          <FormInput
            id="description"
            type="textarea"
            rows={3}
            label={t("departmentForm.description")}
            value={form.description}
            onValueChange={(v) => update("description", (v as string) ?? "")}
            error={errors.description}
          />
        </FormSection>

        <FormSection title={t("departmentForm.hierarchy")} icon={Users}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="parent">{t("departmentForm.parent")}</Label>
            <ServersideLookup<DepartmentLookup>
              id="parent"
              value={parent}
              onChange={(value) => {
                const dep = (value as DepartmentLookup | null) ?? null
                setParent(dep)
                update("parentDepartmentId", dep ? dep.id : null)
              }}
              queryCallback={(term) => api.lookupDepartments(term, departmentId ?? undefined)}
              optionLabel={(d) => d.name}
              placeholder="departmentForm.parentPlaceholder"
              aria-invalid={!!errors.parentDepartmentId}
            />
            {errors.parentDepartmentId ? (
              <p className="text-xs text-destructive">{errors.parentDepartmentId}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("departmentForm.parentHint")}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="manager">{t("departmentForm.manager")}</Label>
            <ServersideLookup<EmployeeLookup>
              id="manager"
              value={manager}
              onChange={(value) => {
                const emp = (value as EmployeeLookup | null) ?? null
                setManager(emp)
                update("managerEmployeeId", emp ? emp.id : null)
              }}
              queryCallback={(term) => api.lookupEmployees(term)}
              optionLabel={(e) => `${e.fullName} (${e.employeeNumber})`}
              placeholder="departmentForm.managerPlaceholder"
              aria-invalid={!!errors.managerEmployeeId}
            />
            {errors.managerEmployeeId ? (
              <p className="text-xs text-destructive">{errors.managerEmployeeId}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("departmentForm.managerHint")}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("departmentForm.active")}</p>
              <p className="text-xs text-muted-foreground">{t("departmentForm.activeHint")}</p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => update("isActive", checked)}
            />
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
          navigate("/departments")
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={t("departmentForm.deleteTitle")}
        description={t("departmentForm.deleteDescription")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </Page>
  )
}
