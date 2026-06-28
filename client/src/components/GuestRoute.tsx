import { Navigate } from "react-router-dom"

import { useAuthStore } from "@/store/auth-store"

// Inverse of ProtectedRoute: only lets guests through. Authenticated users
// are redirected to the dashboard (e.g. visiting /login while signed in).
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const initialized = useAuthStore((state) => state.initialized)

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
