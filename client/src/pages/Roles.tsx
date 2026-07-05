import { useState } from "react"
import { Plus, ShieldCheck, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { Card } from "@/components/ui/card"
import { AppButton } from "@/components/AppButton"
import { ActionButton } from "@/components/ActionButton"
import { FormInput } from "@/components/FormInput"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { api } from "@/lib/api"
import { useResource, useResourceMutation } from "@/lib/query"
import { useAuthStore } from "@/store/auth-store"

interface PermissionItem {
  id: number
  name: string
  isGlobal: boolean
}

interface RoleSummary {
  id: number
  name: string
  permissionIds: number[]
  permissions: string[]
  userCount: number
  scope: string
  // Whether the active context may edit/delete this role (false for shared
  // system templates and other tenants' roles).
  editable: boolean
}

interface RolesResponse {
  roles: RoleSummary[]
  permissions: PermissionItem[]
}

// Display snake_case names as "Title Case" while keeping the raw value for the API.
function humanize(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function RolesPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useResource<RolesResponse>("roles")
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const [newRole, setNewRole] = useState("")
  const [deleteRole, setDeleteRole] = useState<RoleSummary | null>(null)

  const createRole = useResourceMutation((name: string) => api.createRole(name), ["roles"])
  const setPermissions = useResourceMutation(
    (v: { id: number; permissionIds: number[] }) =>
      api.setRolePermissions(v.id, v.permissionIds),
    ["roles"],
  )
  const removeRole = useResourceMutation((id: number) => api.deleteRole(id), ["roles"])

  const permissions = data?.permissions ?? []

  function togglePermission(role: RoleSummary, permId: number) {
    const next = role.permissionIds.includes(permId)
      ? role.permissionIds.filter((p) => p !== permId)
      : [...role.permissionIds, permId]
    setPermissions.mutate({ id: role.id, permissionIds: next })
  }

  return (
    <Page
      title={t("roles.title")}
      icon={ShieldCheck}
      description={t("roles.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.roles") },
      ]}
      loading={isLoading}
    >
      <div className="flex flex-col gap-4">
        <Card className="gap-3 rounded-none p-5 sm:max-w-md">
          <FormInput
            id="newRole"
            label={t("roles.newRole")}
            placeholder={t("roles.newRolePlaceholder")}
            value={newRole}
            onValueChange={(v) => setNewRole((v as string) ?? "")}
            append={
              <AppButton
                icon={Plus}
                loading={createRole.isPending}
                disabled={!newRole.trim()}
                onClick={() =>
                  createRole.mutate(newRole.trim(), { onSuccess: () => setNewRole("") })
                }
              >
                {t("roles.add")}
              </AppButton>
            }
          />
        </Card>

        {data?.roles.map((role) => (
          <Card key={role.id} className="gap-4 rounded-none p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{humanize(role.name)}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("roles.userCount", { count: role.userCount })}
                </p>
              </div>
              {role.editable && (
                <ActionButton
                  tone="destructive"
                  icon={Trash2}
                  onClick={() => setDeleteRole(role)}
                >
                  {t("common.delete")}
                </ActionButton>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {permissions.map((perm) => (
                <label key={perm.id} className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={role.permissionIds.includes(perm.id)}
                    disabled={!role.editable || !hasPermission(perm.name)}
                    onCheckedChange={() => togglePermission(role, perm.id)}
                  />
                  {humanize(perm.name)}
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={deleteRole != null}
        title={t("roles.deleteTitle")}
        description={t("roles.deleteDescription", { name: deleteRole?.name })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        destructive
        onConfirm={() => {
          if (deleteRole) removeRole.mutate(deleteRole.id)
          setDeleteRole(null)
        }}
        onCancel={() => setDeleteRole(null)}
      />
    </Page>
  )
}
