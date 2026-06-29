import { Navigate } from "react-router-dom"

import { useAuthStore } from "@/store/auth-store"

// Route guard that also enforces a permission. Backend authorization is the
// source of truth; this just keeps the UI from showing pages the user can't use.
export function PermissionRoute({
  permission,
  children,
}: {
  permission: string
  children: React.ReactNode
}) {
  const hasPermission = useAuthStore((s) => s.hasPermission)

  if (!hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
