import { useState } from "react"
import { Plus, ShieldCheck, Trash2 } from "lucide-react"

import { Page } from "@/components/Page"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { api } from "@/lib/api"
import { useResource, useResourceMutation } from "@/lib/query"

interface PermissionItem {
  id: number
  name: string
}

interface RoleSummary {
  id: number
  name: string
  permissionIds: number[]
  permissions: string[]
  userCount: number
}

interface RolesResponse {
  roles: RoleSummary[]
  permissions: PermissionItem[]
}

const SUPER_ADMIN = "super_admin"

// Display snake_case names as "Title Case" while keeping the raw value for the API.
function humanize(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function RolesPage() {
  const { data, isLoading } = useResource<RolesResponse>("roles")
  const [newRole, setNewRole] = useState("")
  const [newPermission, setNewPermission] = useState("")
  const [deleteRole, setDeleteRole] = useState<RoleSummary | null>(null)

  const createRole = useResourceMutation((name: string) => api.createRole(name), ["roles"])
  const createPermission = useResourceMutation(
    (name: string) => api.createPermission(name),
    ["roles"],
  )
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
      title="Roles & Permissions"
      icon={ShieldCheck}
      description="Create roles, define permissions, and choose what each role can do."
      breadcrumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Roles & Permissions" },
      ]}
      loading={isLoading}
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="gap-3 rounded-none p-5">
            <Label htmlFor="newRole">New role</Label>
            <div className="flex gap-2">
              <Input
                id="newRole"
                className="rounded-none"
                placeholder="e.g. editor"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              />
              <Button
                className="rounded-none"
                disabled={!newRole.trim()}
                onClick={() =>
                  createRole.mutate(newRole.trim(), { onSuccess: () => setNewRole("") })
                }
              >
                <Plus /> Add
              </Button>
            </div>
          </Card>
          <Card className="gap-3 rounded-none p-5">
            <Label htmlFor="newPerm">New permission</Label>
            <div className="flex gap-2">
              <Input
                id="newPerm"
                className="rounded-none"
                placeholder="e.g. manage_reports"
                value={newPermission}
                onChange={(e) => setNewPermission(e.target.value)}
              />
              <Button
                className="rounded-none"
                disabled={!newPermission.trim()}
                onClick={() =>
                  createPermission.mutate(newPermission.trim(), {
                    onSuccess: () => setNewPermission(""),
                  })
                }
              >
                <Plus /> Add
              </Button>
            </div>
          </Card>
        </div>

        {data?.roles.map((role) => (
          <Card key={role.id} className="gap-4 rounded-none p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{humanize(role.name)}</h3>
                <p className="text-xs text-muted-foreground">
                  {role.userCount} user{role.userCount === 1 ? "" : "s"}
                </p>
              </div>
              {role.name !== SUPER_ADMIN && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-none text-destructive"
                  onClick={() => setDeleteRole(role)}
                >
                  <Trash2 /> Delete
                </Button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {permissions.map((perm) => (
                <label key={perm.id} className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={role.permissionIds.includes(perm.id)}
                    disabled={role.name === SUPER_ADMIN}
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
        title="Delete Role?"
        description={`Remove the "${deleteRole?.name}" role? Users with it will lose its permissions.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
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
