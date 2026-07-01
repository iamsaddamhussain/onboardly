import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, IdCard, Settings2, ShieldCheck, Trash2, UserPen, UserPlus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { FormSection } from "@/components/FormSection"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useResource, useResourceMutation } from "@/lib/query"
import { save, destroy } from "@/lib/resource"
import { ApiError, api, type ManagedUser } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { SUPPORTED_LANGUAGES } from "@/lib/i18n"

const empty = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  mobile: "",
  city: "",
  jobTitle: "",
  language: "en",
  isActive: true,
}

type UserFormState = typeof empty

export default function UserFormPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { id } = useParams()
  const editing = id != null
  const userId = id ? Number(id) : null
  const currentUserId = useAuthStore((s) => s.user?.id)
  // Users cannot delete their own account (enforced on the server too).
  const canDelete = editing && userId != null && userId !== currentUserId
  const canManageRoles = useAuthStore((s) => s.hasPermission("manage_roles"))

  const [form, setForm] = useState<UserFormState>(empty)
  const [dirty, setDirty] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [roleIds, setRoleIds] = useState<number[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Roles list, only needed when this admin can assign roles.
  const { data: rolesData } = useResource<{ roles: { id: number; name: string }[] }>(
    "roles",
    {},
    { enabled: canManageRoles },
  )

  // In edit mode, load the existing user and prefill the form.
  const { data: existing, isLoading } = useResource<ManagedUser>(
    `users/${userId}`,
    {},
    { enabled: editing },
  )

  useEffect(() => {
    if (!existing) return
    setForm({
      firstName: existing.firstName,
      lastName: existing.lastName,
      email: existing.email,
      password: "",
      mobile: existing.mobile ?? "",
      city: existing.city ?? "",
      jobTitle: existing.jobTitle ?? "",
      language: existing.language,
      isActive: existing.isActive,
    })
    setRoleIds(existing.roleIds ?? [])
    setDirty(false)
  }, [existing])

  // save() POSTs when there's no id and PUTs when there is, so the same form
  // handles both create and update. Either way the list + dashboard refresh.
  const mutation = useResourceMutation<ManagedUser, UserFormState>(
    (data) =>
      save<ManagedUser>("users", userId, {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim(),
        // Only send a password when one was typed (required on create).
        password: data.password ? data.password : undefined,
        mobile: data.mobile.trim() || undefined,
        city: data.city.trim() || undefined,
        jobTitle: data.jobTitle.trim() || undefined,
        language: data.language,
        isActive: data.isActive,
      }),
    ["users", "dashboard/stats"],
  )
  const saving = mutation.isPending

  // Delete only applies in edit mode; refreshes the list + dashboard.
  const deleteMutation = useResourceMutation<void, number>(
    (uid) => destroy("users", uid),
    ["users", "dashboard/stats"],
  )

  function update<K extends keyof UserFormState>(key: K, value: UserFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
    // Clear a field's server error as soon as the user edits it.
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
      if (canManageRoles) {
        const targetId = userId ?? saved.id
        if (targetId != null) await api.setUserRoles(targetId, roleIds)
      }
      navigate("/users")
    } catch (err) {
      // Surface server-side validation errors next to their fields.
      if (err instanceof ApiError && err.errors) {
        const fieldErrors: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) {
          fieldErrors[field] = messages[0]
        }
        setErrors(fieldErrors)
      }
    }
  }

  // Cancelling with unsaved changes asks for confirmation first.
  function requestLeave() {
    if (dirty) setConfirmOpen(true)
    else navigate("/users")
  }

  async function handleDelete() {
    if (userId == null) return
    await deleteMutation.mutateAsync(userId)
    setDeleteOpen(false)
    navigate("/users")
  }

  return (
    <Page
      title={editing ? t("userForm.editTitle") : t("userForm.newTitle")}
      icon={editing ? UserPen : UserPlus}
      description={
        editing
          ? t("userForm.editDescription")
          : t("userForm.newDescription")
      }
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.users"), to: "/users" },
        { label: editing ? t("userForm.editTitle") : t("userForm.newTitle") },
      ]}
      loading={editing && isLoading}
      actions={
        <Button
          variant="outline"
          className="rounded-none"
          onClick={requestLeave}
        >
          <ArrowLeft /> {t("common.back")}
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
        <FormSection title={t("userForm.basicDetails")} icon={IdCard}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstName">{t("userForm.firstName")}</Label>
              <Input
                id="firstName"
                className="rounded-none"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lastName">{t("userForm.lastName")}</Label>
              <Input
                id="lastName"
                className="rounded-none"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t("userForm.email")}</Label>
            <Input
              id="email"
              type="email"
              className="rounded-none"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t("userForm.password")}</Label>
            <Input
              id="password"
              type="password"
              className="rounded-none"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              aria-invalid={!!errors.password}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {editing
                  ? t("userForm.passwordHintEdit")
                  : t("userForm.passwordHintNew")}
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="mobile">{t("userForm.mobile")}</Label>
              <Input
                id="mobile"
                className="rounded-none"
                value={form.mobile}
                onChange={(e) => update("mobile", e.target.value)}
                aria-invalid={!!errors.mobile}
              />
              {errors.mobile && (
                <p className="text-xs text-destructive">{errors.mobile}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="city">{t("userForm.city")}</Label>
              <Input
                id="city"
                className="rounded-none"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                aria-invalid={!!errors.city}
              />
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="jobTitle">{t("userForm.jobTitle")}</Label>
            <Input
              id="jobTitle"
              className="rounded-none"
              value={form.jobTitle}
              onChange={(e) => update("jobTitle", e.target.value)}
              aria-invalid={!!errors.jobTitle}
            />
            {errors.jobTitle && (
              <p className="text-xs text-destructive">{errors.jobTitle}</p>
            )}
          </div>
        </FormSection>

        <FormSection title={t("userForm.account")} icon={Settings2}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="language">{t("userForm.language")}</Label>
            <select
              id="language"
              className="rounded-none border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.language}
              onChange={(e) => update("language", e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {t(`languages.${lang}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("userForm.accountActive")}</p>
              <p className="text-xs text-muted-foreground">
                {t("userForm.accountActiveHint")}
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => update("isActive", checked)}
            />
          </div>
        </FormSection>

        {canManageRoles && (
          <FormSection title={t("userForm.roles")} icon={ShieldCheck}>
            <p className="text-xs text-muted-foreground">
              {t("userForm.rolesHint")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {rolesData?.roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={roleIds.includes(role.id)}
                    onCheckedChange={(checked) =>
                      setRoleIds((prev) =>
                        checked
                          ? [...prev, role.id]
                          : prev.filter((r) => r !== role.id),
                      )
                    }
                  />
                  {role.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </label>
              ))}
            </div>
          </FormSection>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            onClick={requestLeave}
          >
            {t("userForm.cancel")}
          </Button>
          {canDelete && (
            <Button
              type="button"
              variant="destructive"
              className="rounded-none"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 /> {t("userForm.delete")}
            </Button>
          )}
          <Button type="submit" className="rounded-none" disabled={saving}>
            {saving
              ? editing
                ? t("userForm.saving")
                : t("userForm.creating")
              : editing
                ? t("userForm.saveChanges")
                : t("userForm.createUser")}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title={t("userForm.discardTitle")}
        description={t("userForm.discardDescription")}
        confirmLabel={t("userForm.discardConfirm")}
        cancelLabel={t("userForm.cancel")}
        destructive
        onConfirm={() => {
          setConfirmOpen(false)
          navigate("/users")
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={t("userForm.deleteTitle")}
        description={t("userForm.deleteDescription")}
        confirmLabel={t("userForm.delete")}
        cancelLabel={t("userForm.cancel")}
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </Page>
  )
}
