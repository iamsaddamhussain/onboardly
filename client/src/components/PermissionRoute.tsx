import { Navigate } from "react-router-dom"

import { useAuthStore } from "@/store/auth-store"

// Route guard that also enforces a permission. Backend authorization is the
// source of truth; this just keeps the UI from showing pages the user can't use.
// Accepts a single permission or a list (access is granted if the user has any).
export function PermissionRoute({
  permission,
  children,
}: {
  permission: string | string[]
  children: React.ReactNode
}) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const required = Array.isArray(permission) ? permission : [permission]

  if (!required.some((p) => hasPermission(p))) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
