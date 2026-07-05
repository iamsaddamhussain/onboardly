import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { ListTodo } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

import { AppButton } from "@/components/AppButton"
import { FormInput } from "@/components/FormInput"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuthStore } from "@/store/auth-store"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#F25022" d="M11.4 11.4H2V2h9.4v9.4Z" />
      <path fill="#7FBA00" d="M22 11.4h-9.4V2H22v9.4Z" />
      <path fill="#00A4EF" d="M11.4 22H2v-9.4h9.4V22Z" />
      <path fill="#FFB900" d="M22 22h-9.4v-9.4H22V22Z" />
    </svg>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const login = useAuthStore((state) => state.login)

  const [email, setEmail] = useState("demo@onboardly.dev")
  const [password, setPassword] = useState("Password123!")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    // Errors are surfaced by the axios interceptor (toast) and the global
    // ApiError rejection guard, so a failed login simply throws here, skips
    // the redirect, and never runs navigate.
    await login(email, password).finally(() => setSubmitting(false))
    navigate("/dashboard", { replace: true })
  }

  // OAuth is not wired up yet — these are placeholders.
  function handleOAuth(provider: string) {
    toast.info(t("toasts.oauthComingSoon", { provider }))
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: visual / brand panel (hidden on small screens) */}
      <div className="relative hidden w-1/2 lg:block">
        <img
          src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80"
          alt={t("login.workspaceAlt")}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/60" />
        <div className="relative flex h-full flex-col justify-between p-10 text-primary-foreground">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center bg-background text-foreground">
              <ListTodo className="size-5" />
            </div>
            <span className="text-lg font-semibold">{t("common.appName")}</span>
          </div>
          <div>
            <h2 className="text-3xl font-semibold leading-tight">
              {t("login.heroTitle")}
            </h2>
            <p className="mt-3 max-w-md text-sm text-primary-foreground/80">
              {t("login.heroSubtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Right: sign-in form */}
      <div className="flex w-full items-center justify-center bg-muted/40 p-6 lg:w-1/2">
        <Card className="animate-page w-full max-w-sm rounded-none">
          <CardHeader>
            <CardTitle className="text-xl">{t("login.title")}</CardTitle>
            <CardDescription>
              {t("login.subtitle")}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="flex flex-col gap-4">
              <FormInput
                id="email"
                type="email"
                autoComplete="username"
                label={t("login.email")}
                value={email}
                onValueChange={(v) => setEmail((v as string) ?? "")}
                required
              />
              <FormInput
                id="password"
                type="password"
                autoComplete="current-password"
                label={t("login.password")}
                value={password}
                onValueChange={(v) => setPassword((v as string) ?? "")}
                required
              />
            </CardContent>
            <CardFooter className="mt-6 flex flex-col gap-4">
              <AppButton
                type="submit"
                className="w-full"
                loading={submitting}
                loadingText={t("login.signingIn")}
              >
                {t("login.signIn")}
              </AppButton>

              <div className="flex w-full items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">
                  {t("login.orContinue")}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="grid w-full grid-cols-2 gap-3">
                <AppButton
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuth("Google")}
                >
                  <GoogleIcon /> Google
                </AppButton>
                <AppButton
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuth("Microsoft")}
                >
                  <MicrosoftIcon /> Microsoft
                </AppButton>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
