import { ArrowLeft, Building2, Clock, Save } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Page } from "@/components/Page"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { AppButton } from "@/components/AppButton"
import { TimePicker } from "@/components/TimePicker"
import { useResource, useResourceMutation } from "@/lib/query"
import { api, type OrganizationProfile } from "@/lib/api"

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const

export default function OrganizationEditPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading } = useResource<OrganizationProfile>("organization")

  const toHHmm = (value: string) => value.slice(0, 5)
  const [timeZone, setTimeZone] = useState("UTC")
  const [workDays, setWorkDays] = useState<string[]>([])
  const [workdayStart, setWorkdayStart] = useState("09:00")
  const [workdayEnd, setWorkdayEnd] = useState("18:00")
  const [breakMinutes, setBreakMinutes] = useState(60)
  const [flagMissingPunches, setFlagMissingPunches] = useState(true)

  useEffect(() => {
    if (!data) return
    setTimeZone(data.timeZone)
    setWorkDays(data.workDays)
    setWorkdayStart(toHHmm(data.workdayStart))
    setWorkdayEnd(toHHmm(data.workdayEnd))
    setBreakMinutes(data.breakMinutes)
    setFlagMissingPunches(data.flagMissingPunches)
  }, [data])

  const toggleDay = (day: string) =>
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )

  const timeZones = useMemo(() => {
    let zones: string[]
    try {
      zones = (Intl as unknown as { supportedValuesOf: (k: string) => string[] })
        .supportedValuesOf("timeZone")
    } catch {
      zones = ["UTC"]
    }
    const current = data?.timeZone
    return current && !zones.includes(current) ? [current, ...zones] : zones
  }, [data?.timeZone])

  const mutation = useResourceMutation<void, void>(
    () =>
      api.updateOrganizationAttendance({
        timeZone,
        workDays,
        workdayStart,
        workdayEnd,
        breakMinutes,
        flagMissingPunches,
      }),
    ["organization"],
    {
      onSuccess: () => {
        toast.success(t("organizationProfile.attendanceSaved"))
        navigate("/organization")
      },
    },
  )

  return (
    <Page
      title={t("organizationEdit.title")}
      icon={Building2}
      description={t("organizationEdit.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("organizationProfile.title"), to: "/organization" },
        { label: t("common.edit") },
      ]}
      loading={isLoading}
      actions={
        <AppButton variant="outline" icon={ArrowLeft} onClick={() => navigate("/organization")}>
          {t("common.back")}
        </AppButton>
      }
    >
      {data && (
        <Card className="gap-5 rounded-none p-6">
          <div className="flex items-center gap-3">
            <Clock className="size-5 text-muted-foreground" />
            <div>
              <h2 className="text-base font-semibold">{t("organizationProfile.attendanceTitle")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("organizationProfile.attendanceDescription")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="timeZone">{t("organizationProfile.timeZone")}</Label>
              <select
                id="timeZone"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="h-9 w-full border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {timeZones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>{t("organizationProfile.workDays")}</Label>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map((day) => {
                  const active = workDays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={
                        "border px-3 py-1.5 text-sm transition-colors " +
                        (active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-muted-foreground hover:text-foreground")
                      }
                    >
                      {t(`weekdays.${day}`)}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="workdayStart">{t("organizationProfile.workdayStart")}</Label>
              <TimePicker
                id="workdayStart"
                value={workdayStart}
                onChange={setWorkdayStart}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="workdayEnd">{t("organizationProfile.workdayEnd")}</Label>
              <TimePicker
                id="workdayEnd"
                value={workdayEnd}
                onChange={setWorkdayEnd}
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="breakMinutes">{t("organizationProfile.breakMinutes")}</Label>
              <Input
                id="breakMinutes"
                type="number"
                min={0}
                max={1440}
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Number(e.target.value))}
                className="max-w-40"
              />
            </div>

            <div className="flex items-center justify-between gap-3 sm:col-span-2">
              <div>
                <Label htmlFor="flagMissingPunches">{t("organizationProfile.flagMissingPunches")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("organizationProfile.flagMissingPunchesHint")}
                </p>
              </div>
              <Switch
                id="flagMissingPunches"
                checked={flagMissingPunches}
                onCheckedChange={setFlagMissingPunches}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <AppButton variant="outline" onClick={() => navigate("/organization")}>
              {t("common.cancel")}
            </AppButton>
            <AppButton
              icon={Save}
              loading={mutation.isPending}
              loadingText={t("common.saving")}
              onClick={() => mutation.mutate()}
            >
              {t("common.saveChanges")}
            </AppButton>
          </div>
        </Card>
      )}
    </Page>
  )
}
