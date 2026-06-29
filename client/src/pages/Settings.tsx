import { Monitor, Moon, Settings as SettingsIcon, Sun } from "lucide-react"

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

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <Page
      title="Settings"
      icon={SettingsIcon}
      description="Manage your workspace preferences."
      breadcrumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Settings" },
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how Onboardly looks to you.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {options.map(({ value, label, icon: Icon }) => (
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
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </Page>
  )
}
