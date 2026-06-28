import { useEffect, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"

import { setUnauthorizedHandler } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"

// Runs once near the top of the tree: restores the session and connects the
// api client's global 401 handler to the auth store + the router.
export function AuthBootstrap({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  useEffect(() => {
    setUnauthorizedHandler(() => {
      useAuthStore.getState().sessionExpired()
      navigate("/login", { replace: true })
    })
    useAuthStore.getState().fetchCurrentUser()
    return () => setUnauthorizedHandler(null)
  }, [navigate])

  return <>{children}</>
}
