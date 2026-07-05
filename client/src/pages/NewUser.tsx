import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, IdCard, LogIn, Settings2, ShieldCheck, Trash2, UserPen, UserPlus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { FormSection } from "@/components/FormSection"
import { FormInput } from "@/components/FormInput"
import { FormSelect } from "@/components/FormSelect"
import { ServersideLookup } from "@/components/ServersideLookup"
import { AppButton } from "@/components/AppButton"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useResource, useResourceMutation } from "@/lib/query"
import { save, destroy } from "@/lib/resource"
import { ApiError, api, type ManagedUser, type Organization } from "@/lib/api"
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
  organizationId: null as number | null,
}

type UserFormState = typeof empty

export default function UserFormPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { id } = useParams()
  const editing = id != null
  const userId = id ? Number(id) : null
  // A non-numeric route id (e.g. /users/abc/edit) can never match a real user.
  const invalidId = editing && (userId == null || Number.isNaN(userId))
  const currentUserId = useAuthStore((s) => s.user?.id)
  // Users cannot delete their own account (enforced on the server too).
  const canDelete = editing && userId != null && userId !== currentUserId
  const canManageRoles = useAuthStore((s) => s.hasPermission("manage_roles"))
  const canImpersonate = useAuthStore((s) => s.hasPermission("impersonate_users"))
  // Only platform admins can move a user between organizations.
  const canAssignOrg = useAuthStore((s) => s.hasPermission("platform.switch_organization"))
  const impersonate = useAuthStore((s) => s.impersonate)
  // Impersonation is a super-admin action and never applies to your own account.
  const canImpersonateUser =
    editing && userId != null && userId !== currentUserId && canImpersonate

  const [form, setForm] = useState<UserFormState>(empty)
  const [dirty, setDirty] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [roleIds, setRoleIds] = useState<number[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  // The selected organization object (drives the lookup's label); its id is kept
  // in the form state for submission.
  const [orgSelection, setOrgSelection] = useState<Organization | null>(null)

  // Roles list, only needed when this admin can assign roles.
  const { data: rolesData } = useResource<{ roles: { id: number; name: string }[] }>(
    "roles",
    {},
    { enabled: canManageRoles },
  )

  // In edit mode, load the existing user and prefill the form.
  const { data: existing, isLoading, isError } = useResource<ManagedUser>(
    `users/${userId}`,
    {},
    { enabled: editing && !invalidId },
  )

  // If the id is malformed or the user doesn't exist, bounce back to the list.
  useEffect(() => {
    if (invalidId || isError) navigate("/users", { replace: true })
  }, [invalidId, isError, navigate])

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
      organizationId: existing.organizationId,
    })
    setRoleIds(existing.roleIds ?? [])
    // Seed the lookup with the user's current org so it shows a label on load.
    setOrgSelection(
      existing.organizationId != null
        ? {
            id: existing.organizationId,
            name: existing.organizationName ?? "",
            slug: "",
            isActive: true,
          }
        : null,
    )
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
        // Only platform admins may set the organization; otherwise the server
        // keeps the user in the active tenant regardless of what is sent.
        organizationId: canAssignOrg ? data.organizationId : undefined,
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

  async function handleImpersonate() {
    if (userId == null) return
    await impersonate(userId)
    navigate("/dashboard", { replace: true })
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
        <div className="flex gap-2">
          {canImpersonateUser && (
            <AppButton
              variant="outline"
              className="cursor-pointer text-primary hover:text-primary"
              icon={LogIn}
              onClick={handleImpersonate}
            >
              {t("userForm.loginToImpersonate")}
            </AppButton>
          )}
          <AppButton variant="outline" icon={ArrowLeft} onClick={requestLeave}>
            {t("common.back")}
          </AppButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
        <FormSection title={t("userForm.basicDetails")} icon={IdCard}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput
              id="firstName"
              label={t("userForm.firstName")}
              required
              value={form.firstName}
              onValueChange={(v) => update("firstName", (v as string) ?? "")}
              error={errors.firstName}
            />
            <FormInput
              id="lastName"
              label={t("userForm.lastName")}
              required
              value={form.lastName}
              onValueChange={(v) => update("lastName", (v as string) ?? "")}
              error={errors.lastName}
            />
          </div>

          <FormInput
            id="email"
            type="email"
            label={t("userForm.email")}
            required
            value={form.email}
            onValueChange={(v) => update("email", (v as string) ?? "")}
            error={errors.email}
          />

          <FormInput
            id="password"
            type="password"
            label={t("userForm.password")}
            required={!editing}
            value={form.password}
            onValueChange={(v) => update("password", (v as string) ?? "")}
            error={errors.password}
            hint={editing ? t("userForm.passwordHintEdit") : t("userForm.passwordHintNew")}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput
              id="mobile"
              type="tel"
              inputMode="numeric"
              label={t("userForm.mobile")}
              value={form.mobile}
              onValueChange={(v) => update("mobile", (v as string) ?? "")}
              transform={(raw) => raw.replace(/[^0-9]/g, "")}
              error={errors.mobile}
            />
            <FormInput
              id="city"
              label={t("userForm.city")}
              value={form.city}
              onValueChange={(v) => update("city", (v as string) ?? "")}
              error={errors.city}
            />
          </div>

          <FormInput
            id="jobTitle"
            label={t("userForm.jobTitle")}
            value={form.jobTitle}
            onValueChange={(v) => update("jobTitle", (v as string) ?? "")}
            error={errors.jobTitle}
          />
        </FormSection>

        <FormSection title={t("userForm.account")} icon={Settings2}>
          <FormSelect
            id="language"
            label={t("userForm.language")}
            value={form.language}
            onValueChange={(v) => update("language", (v as string) ?? "en")}
            options={SUPPORTED_LANGUAGES.map((lang) => ({
              value: lang,
              label: t(`languages.${lang}`),
            }))}
          />
          {canAssignOrg && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="organization">{t("userForm.organization")}</Label>
              <ServersideLookup<Organization>
                id="organization"
                value={orgSelection}
                onChange={(value) => {
                  const org = (value as Organization | null) ?? null
                  setOrgSelection(org)
                  update("organizationId", org ? org.id : null)
                }}
                queryCallback={(term) => api.listOrganizations(term)}
                optionLabel={(org) => org.name}
                placeholder="userForm.organizationPlaceholder"
                aria-invalid={!!errors.organizationId}
              />
              {errors.organizationId ? (
                <p className="text-xs text-destructive">{errors.organizationId}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("userForm.organizationHint")}
                </p>
              )}
            </div>
          )}
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
          <AppButton type="button" variant="outline" onClick={requestLeave}>
            {t("userForm.cancel")}
          </AppButton>
          {canDelete && (
            <AppButton
              type="button"
              variant="destructive"
              icon={Trash2}
              onClick={() => setDeleteOpen(true)}
            >
              {t("userForm.delete")}
            </AppButton>
          )}
          <AppButton
            type="submit"
            loading={saving}
            loadingText={editing ? t("userForm.saving") : t("userForm.creating")}
          >
            {editing ? t("userForm.saveChanges") : t("userForm.createUser")}
          </AppButton>
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
