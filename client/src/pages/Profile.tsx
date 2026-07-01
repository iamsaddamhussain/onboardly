import { useEffect, useState, type FormEvent } from "react"
import { IdCard, Mail, User as UserIcon } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { FormSection } from "@/components/FormSection"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { useResource, useResourceMutation } from "@/lib/query"
import { api, ApiError, type Profile } from "@/lib/api"

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
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstName">{t("profile.firstName")}</Label>
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
              <Label htmlFor="lastName">{t("profile.lastName")}</Label>
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
            <Label htmlFor="email">{t("profile.email")}</Label>
            <Input
              id="email"
              className="rounded-none"
              value={profile?.email ?? ""}
              disabled
              readOnly
            />
            <p className="text-xs text-muted-foreground">
              {t("profile.emailHint")}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="mobile">{t("profile.mobile")}</Label>
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
              <Label htmlFor="city">{t("profile.city")}</Label>
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
            <Label htmlFor="jobTitle">{t("profile.jobTitle")}</Label>
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

        <div className="flex justify-end">
          <Button type="submit" className="rounded-none" disabled={saving}>
            {saving ? t("profile.saving") : t("profile.saveChanges")}
          </Button>
        </div>
      </form>
    </Page>
  )
}
