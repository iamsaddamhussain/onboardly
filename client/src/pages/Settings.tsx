import { Monitor, Moon, Settings as SettingsIcon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Page } from "@/components/Page"
import { useTheme, type Theme } from "@/components/theme-provider"

const options: { value: Theme; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
]

export default function SettingsPage() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  return (
    <Page
      title={t("settings.title")}
      icon={SettingsIcon}
      description={t("settings.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("settings.title") },
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.appearance")}</CardTitle>
          <CardDescription>{t("settings.appearanceDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {options.map(({ value, icon: Icon }) => (
              <Button
                key={value}
                type="button"
                variant="outline"
                onClick={() => setTheme(value)}
                className={cn(
                  "h-auto flex-col gap-2 py-4",
                  theme === value && "border-primary ring-2 ring-ring"
                )}
              >
                <Icon className="size-5" />
                {t(`settings.${value}`)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </Page>
  )
}
