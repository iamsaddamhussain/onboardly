import { ChevronDown, Globe, LogOut, Moon, User as UserIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"
import { useAuthStore } from "@/store/auth-store"
import { SUPPORTED_LANGUAGES } from "@/lib/i18n"

export function ProfileMenu() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const setLanguage = useAuthStore((state) => state.setLanguage)
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  async function handleLogout() {
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="cursor-pointer gap-3 px-2 py-6 focus-visible:ring-0">
          <span className="flex size-8 items-center justify-center rounded-none bg-primary text-xs font-medium text-primary-foreground">
            <UserIcon className="size-4" />
          </span>
          <span className="max-w-[12rem] truncate text-sm font-medium">
            {user?.email}
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-2">
        <DropdownMenuItem
          onSelect={() => navigate("/profile")}
          className="gap-3 px-3 py-2.5"
        >
          <UserIcon className="size-4" /> {t("profileMenu.myProfile")}
        </DropdownMenuItem>

        {/* Same look as the other items; preventDefault keeps the menu open. */}
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            setTheme(isDark ? "light" : "dark")
          }}
          className="justify-between gap-3 px-3 py-2.5"
        >
          <span className="flex items-center gap-3">
            <Moon className="size-4" /> {t("profileMenu.darkMode")}
          </span>
          <Switch
            checked={isDark}
            aria-hidden
            tabIndex={-1}
            className="pointer-events-none"
          />
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-3 px-3 py-2.5">
            <Globe className="size-4" /> {t("profileMenu.language")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={i18n.language}
              onValueChange={(value) => void setLanguage(value as never)}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <DropdownMenuRadioItem key={lang} value={lang}>
                  {t(`languages.${lang}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={handleLogout}
          className="gap-3 px-3 py-2.5 text-destructive"
        >
          <LogOut className="size-4" /> {t("profileMenu.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
