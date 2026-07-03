import { AlertTriangle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { useAuthStore } from "@/store/auth-store"

// Persistent banner shown while an admin is impersonating another user. It makes
// the impersonated identity obvious and offers a one-click way back.
export function ImpersonationBanner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const stopImpersonating = useAuthStore((s) => s.stopImpersonating)

  if (!user?.impersonating) return null

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email

  async function handleReturn() {
    await stopImpersonating()
    navigate("/users", { replace: true })
  }

  return (
    <div className="flex items-center gap-3 bg-primary px-4 py-2.5 text-sm text-primary-foreground md:px-6">
      <AlertTriangle className="size-5 shrink-0" />
      <span>
        {t("impersonation.loggedInAs")} <strong>{name}</strong>
      </span>
      <button
        type="button"
        onClick={handleReturn}
        className="ml-auto cursor-pointer font-semibold underline underline-offset-2 hover:no-underline"
      >
        {t("impersonation.return")}
      </button>
    </div>
  )
}
