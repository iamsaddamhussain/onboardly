import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, UserPen, UserPlus } from "lucide-react"

import { Page } from "@/components/Page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useResource, useResourceMutation } from "@/lib/query"
import { save } from "@/lib/resource"
import { ApiError, type ManagedUser } from "@/lib/api"

const empty = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  mobile: "",
  city: "",
  jobTitle: "",
  isActive: true,
}

type UserFormState = typeof empty

export default function UserFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const editing = id != null
  const userId = id ? Number(id) : null

  const [form, setForm] = useState<UserFormState>(empty)
  const [dirty, setDirty] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

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
      isActive: existing.isActive,
    })
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
        isActive: data.isActive,
      }),
    ["users", "dashboard/stats"],
  )
  const saving = mutation.isPending

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
      await mutation.mutateAsync(form)
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

  return (
    <Page
      title={editing ? "Edit User" : "New User"}
      icon={editing ? UserPen : UserPlus}
      description={
        editing
          ? "Update this person's details."
          : "Add a new person to your workspace."
      }
      loading={editing && isLoading}
      actions={
        <Button
          variant="outline"
          className="rounded-none"
          onClick={requestLeave}
        >
          <ArrowLeft /> Back
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="max-w-2xl">
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firstName">First name</Label>
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
                <Label htmlFor="lastName">Last name</Label>
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
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Password</Label>
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
                    ? "Leave blank to keep the current password."
                    : "Must be at least 8 characters."}
                </p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="mobile">Mobile</Label>
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
                <Label htmlFor="city">City</Label>
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
              <Label htmlFor="jobTitle">Job title</Label>
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

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-sm font-medium">Account active</p>
                <p className="text-xs text-muted-foreground">
                  Inactive users can't sign in.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => update("isActive", checked)}
              />
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                onClick={requestLeave}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-none" disabled={saving}>
                {saving
                  ? editing
                    ? "Saving…"
                    : "Creating…"
                  : editing
                    ? "Save Changes"
                    : "Create User"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Discard Changes?"
        description="You have unsaved changes, are you sure you want to discard them?"
        confirmLabel="Discard Changes"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          setConfirmOpen(false)
          navigate("/users")
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </Page>
  )
}
