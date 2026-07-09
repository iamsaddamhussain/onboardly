import { useState } from "react"
import { Building2, Check, ChevronsUpDown } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api, type Organization } from "@/lib/api"
import { queryClient } from "@/lib/query"
import { useAuthStore } from "@/store/auth-store"
import { cn } from "@/lib/utils"

const SWITCH_PERMISSION = "platform.switch_organization"

// Header control for the tenant context:
//   * organization users see a static current-organization label
//   * global users with platform.switch_organization get a tenant selector
export function OrgSwitcher() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const switchOrganization = useAuthStore((s) => s.switchOrganization)
  const stopSwitchOrganization = useAuthStore((s) => s.stopSwitchOrganization)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!user) return null

  // Organization users: static current-organization label (no switcher).
  if (user.scope !== "global") {
    if (!user.organizationName) return null
    return (
      <div className="flex items-center gap-2 border px-3 py-1.5 text-sm text-muted-foreground">
        <Building2 className="size-4" />
        <span className="max-w-48 truncate font-medium text-foreground">
          {user.organizationName}
        </span>
      </div>
    )
  }

  // Global users without the switch permission: nothing to show.
  if (!hasPermission(SWITCH_PERMISSION)) return null

  const activeLabel = user.activeOrganizationName ?? t("organization.allOrganizations")

  async function loadOrganizations() {
    if (organizations.length > 0) return
    setLoading(true)
    setOrganizations(await api.listOrganizations())
    setLoading(false)
  }

  async function handleSelect(organizationId: number | null) {
    setBusy(true)
    if (organizationId === null) await stopSwitchOrganization()
    else await switchOrganization(organizationId)
    // Cached data is tenant-scoped; refetch everything for the new scope.
    await queryClient.invalidateQueries()
    setBusy(false)
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && loadOrganizations()}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={busy} className="cursor-pointer gap-2 rounded-none">
          <Building2 className="size-4" />
          <span className="max-w-48 truncate text-sm font-medium">{activeLabel}</span>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-1">
        <DropdownMenuLabel>{t("organization.switch")}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => handleSelect(null)} className="gap-2 px-3 py-2">
          <Check
            className={cn(
              "size-4",
              user.activeOrganizationId == null ? "opacity-100" : "opacity-0",
            )}
          />
          {t("organization.allOrganizations")}
        </DropdownMenuItem>

        {loading && (
          <div className="px-3 py-2 text-sm text-muted-foreground">{t("common.loading")}</div>
        )}

        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            disabled={!org.isActive}
            onSelect={() => handleSelect(org.id)}
            className="gap-2 px-3 py-2"
          >
            <Check
              className={cn(
                "size-4",
                user.activeOrganizationId === org.id ? "opacity-100" : "opacity-0",
              )}
            />
            <span className="truncate">{org.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
