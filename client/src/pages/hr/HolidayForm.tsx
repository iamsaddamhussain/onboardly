import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, CalendarCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { FormSection } from "@/components/FormSection"
import { FormInput } from "@/components/FormInput"
import { FormSelect } from "@/components/FormSelect"
import { AppButton } from "@/components/AppButton"
import { FormActions } from "@/components/FormActions"
import { DatePicker } from "@/components/DatePicker"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useResource, useResourceMutation } from "@/lib/query"
import { save, destroy } from "@/lib/resource"
import {
  ApiError,
  HOLIDAY_TYPES,
  type HolidayRow,
  type HolidayType,
  type SaveHolidayInput,
} from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"

const empty: SaveHolidayInput = {
  name: "",
  date: "",
  type: "Company",
  region: null,
  description: null,
  isActive: true,
}

export default function HolidayFormPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { id } = useParams()
  const editing = id != null
  const holidayId = id ? Number(id) : null
  const invalidId = editing && (holidayId == null || Number.isNaN(holidayId))
  const canManage = useAuthStore((s) => s.hasPermission("holidays.manage"))

  const [form, setForm] = useState<SaveHolidayInput>(empty)
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: existing, isLoading, isError } = useResource<HolidayRow>(
    `holidays/${holidayId}`,
    {},
    { enabled: editing && !invalidId },
  )

  useEffect(() => {
    if (invalidId || isError) navigate("/holidays", { replace: true })
  }, [invalidId, isError, navigate])

  useEffect(() => {
    if (!existing) return
    setForm({
      name: existing.name,
      date: existing.date.slice(0, 10),
      type: existing.type,
      region: existing.region,
      description: existing.description,
      isActive: existing.isActive,
    })
    setDirty(false)
  }, [existing])

  const mutation = useResourceMutation<HolidayRow, SaveHolidayInput>(
    (data) => save<HolidayRow>("holidays", holidayId, data),
    ["holidays"],
  )
  const deleteMutation = useResourceMutation<void, number>(
    (hid) => destroy("holidays", hid),
    ["holidays"],
  )

  function update<K extends keyof SaveHolidayInput>(key: K, value: SaveHolidayInput[K]) {
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
      await mutation.mutateAsync({
        ...form,
        name: form.name.trim(),
        region: form.region?.trim() || null,
        description: form.description?.trim() || null,
      })
      navigate("/holidays")
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors)
    }
  }

  function requestLeave() {
    if (dirty) setConfirmOpen(true)
    else navigate("/holidays")
  }

  async function handleDelete() {
    if (holidayId == null) return
    await deleteMutation.mutateAsync(holidayId)
    setDeleteOpen(false)
    navigate("/holidays")
  }

  return (
    <Page
      title={editing ? t("holidayForm.editTitle") : t("holidayForm.newTitle")}
      icon={CalendarCheck}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.holidays"), to: "/holidays" },
        { label: editing ? t("holidayForm.editTitle") : t("holidayForm.newTitle") },
      ]}
      loading={editing && isLoading}
      actions={
        <AppButton variant="outline" icon={ArrowLeft} onClick={requestLeave}>
          {t("common.back")}
        </AppButton>
      }
    >
      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
        <FormSection title={t("holidayForm.details")} icon={CalendarCheck}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput
              id="name"
              label={t("holidayForm.name")}
              required
              value={form.name}
              onValueChange={(v) => update("name", (v as string) ?? "")}
              error={errors.name}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="date" required>
                {t("holidayForm.date")}
              </Label>
              <DatePicker
                id="date"
                value={form.date}
                onChange={(v) => update("date", v)}
                clearable={false}
                aria-invalid={!!errors.date}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date}</p>
              )}
            </div>
            <FormSelect
              id="type"
              label={t("holidayForm.type")}
              value={form.type}
              onValueChange={(v) => update("type", (v as HolidayType) ?? "Company")}
              options={HOLIDAY_TYPES.map((h) => ({
                value: h,
                label: t(`holidayType.${h}`),
              }))}
            />
            <FormInput
              id="region"
              label={t("holidayForm.region")}
              value={form.region ?? ""}
              onValueChange={(v) => update("region", ((v as string) || null))}
              hint={t("holidayForm.regionHint")}
            />
          </div>
          <FormInput
            id="description"
            label={t("holidayForm.description")}
            value={form.description ?? ""}
            onValueChange={(v) => update("description", ((v as string) || null))}
          />
          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="isActive">{t("holidayForm.isActive")}</Label>
            <Switch
              id="isActive"
              checked={form.isActive}
              onCheckedChange={(v) => update("isActive", v)}
            />
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
          navigate("/holidays")
        }}
        onCancel={() => setConfirmOpen(false)}
      />
      <ConfirmDialog
        open={deleteOpen}
        title={t("holidayForm.deleteTitle")}
        description={t("holidayForm.deleteDescription")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </Page>
  )
}
