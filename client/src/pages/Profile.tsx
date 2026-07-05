import { useEffect, useState, type FormEvent } from "react"
import { IdCard, Mail, User as UserIcon } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { FormSection } from "@/components/FormSection"
import { FormInput } from "@/components/FormInput"
import { Timeline } from "@/components/Timeline"
import { AppButton } from "@/components/AppButton"
import { Card } from "@/components/ui/card"
import { useResource, useResourceMutation } from "@/lib/query"
import { api, ApiError, type AuditLogEntry, type Profile } from "@/lib/api"

const empty = {
  firstName: "",
  lastName: "",
  mobile: "",
  city: "",
  jobTitle: "",
}

type ProfileFormState = typeof empty

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const [form, setForm] = useState<ProfileFormState>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: profile, isLoading } = useResource<Profile>("auth/profile")
  const { data: activity } = useResource<AuditLogEntry[]>("auth/activity")

  useEffect(() => {
    if (!profile) return
    setForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      mobile: profile.mobile ?? "",
      city: profile.city ?? "",
      jobTitle: profile.jobTitle ?? "",
    })
  }, [profile])

  const mutation = useResourceMutation<Profile, ProfileFormState>(
    (data) =>
      api.updateProfile({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        mobile: data.mobile.trim() || undefined,
        city: data.city.trim() || undefined,
        jobTitle: data.jobTitle.trim() || undefined,
      }),
    ["auth/profile"],
    { onSuccess: () => toast.success(t("toasts.profileUpdated")) },
  )
  const saving = mutation.isPending

  function update<K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
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
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const fieldErrors: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) {
          fieldErrors[field] = messages[0]
        }
        setErrors(fieldErrors)
      }
    }
  }

  return (
    <Page
      title={t("profile.title")}
      icon={UserIcon}
      description={t("profile.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("profile.title") },
      ]}
      loading={isLoading}
    >
      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
        {/* Read-only summary header */}
        <Card className="flex-row items-center gap-4 rounded-none p-6">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
            {(profile?.firstName?.[0] ?? "") + (profile?.lastName?.[0] ?? "") ||
              "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">
              {profile ? `${profile.firstName} ${profile.lastName}` : "—"}
            </p>
            <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <Mail className="size-3.5" /> {profile?.email}
            </p>
            {profile && (
              <p className="text-xs text-muted-foreground">
                {t("profile.memberSince", { date: formatDate(profile.createdAt) })}
              </p>
            )}
          </div>
        </Card>

        <FormSection title={t("profile.basicDetails")} icon={IdCard}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput
              id="firstName"
              label={t("profile.firstName")}
              value={form.firstName}
              onValueChange={(v) => update("firstName", (v as string) ?? "")}
              error={errors.firstName}
            />
            <FormInput
              id="lastName"
              label={t("profile.lastName")}
              value={form.lastName}
              onValueChange={(v) => update("lastName", (v as string) ?? "")}
              error={errors.lastName}
            />
          </div>

          <FormInput
            id="email"
            label={t("profile.email")}
            value={profile?.email ?? ""}
            onValueChange={() => {}}
            disabled
            readOnly
            hint={t("profile.emailHint")}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput
              id="mobile"
              label={t("profile.mobile")}
              value={form.mobile}
              onValueChange={(v) => update("mobile", (v as string) ?? "")}
              error={errors.mobile}
            />
            <FormInput
              id="city"
              label={t("profile.city")}
              value={form.city}
              onValueChange={(v) => update("city", (v as string) ?? "")}
              error={errors.city}
            />
          </div>

          <FormInput
            id="jobTitle"
            label={t("profile.jobTitle")}
            value={form.jobTitle}
            onValueChange={(v) => update("jobTitle", (v as string) ?? "")}
            error={errors.jobTitle}
          />
        </FormSection>

        <div className="flex justify-end">
          <AppButton
            type="submit"
            loading={saving}
            loadingText={t("profile.saving")}
          >
            {t("profile.saveChanges")}
          </AppButton>
        </div>
      </form>

      <div className="mt-8 max-w-2xl">
        <Card className="gap-4 rounded-none p-6">
          <h3 className="text-sm font-semibold">{t("profile.activityTitle")}</h3>
          <Timeline entries={activity ?? []} emptyLabel={t("profile.activityEmpty")} />
        </Card>
      </div>
    </Page>
  )
}
