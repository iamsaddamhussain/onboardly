import { ArrowLeft, Building2, CalendarDays, Clock, CreditCard, Hash, History, Pencil, Users, X } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { Page } from "@/components/Page"
import { Card } from "@/components/ui/card"
import { AppButton } from "@/components/AppButton"
import { TimelineCard } from "@/components/TimelineCard"
import { ContributionGraph } from "@/components/ContributionGraph"
import { Avatar } from "@/components/Avatar"
import { StatusPill } from "@/components/StatusPill"
import { useResource } from "@/lib/query"
import { type ActivityHeatmapPoint, type AuditLogEntry, type OrganizationProfile } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { formatLongDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type TabKey = "overview" | "attendance" | "activity"

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Hash
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="w-28 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  )
}

// HR-managed attendance policy shown read-only. Editing happens on the dedicated
// organization edit page (reached via the Edit button in the page header).
function AttendanceSettingsCard({ profile }: { profile: OrganizationProfile }) {
  const { t } = useTranslation()
  const toHHmm = (value: string) => value.slice(0, 5)

  return (
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

      <div className="flex flex-col gap-3 border-t pt-4">
        <InfoRow icon={Clock} label={t("organizationProfile.timeZone")}>{profile.timeZone}</InfoRow>
        <InfoRow icon={Clock} label={t("organizationProfile.workDays")}>
          {profile.workDays.length
            ? profile.workDays.map((d) => t(`weekdays.${d}`)).join(", ")
            : t("common.dash")}
        </InfoRow>
        <InfoRow icon={Clock} label={t("organizationProfile.workdayStart")}>
          {toHHmm(profile.workdayStart)}
        </InfoRow>
        <InfoRow icon={Clock} label={t("organizationProfile.workdayEnd")}>
          {toHHmm(profile.workdayEnd)}
        </InfoRow>
        <InfoRow icon={Clock} label={t("organizationProfile.breakMinutes")}>
          {profile.breakMinutes}
        </InfoRow>
        <InfoRow icon={Clock} label={t("organizationProfile.flagMissingPunches")}>
          <StatusPill
            active={profile.flagMissingPunches}
            activeLabel={t("organizationProfile.autoCheckoutOn")}
            inactiveLabel={t("organizationProfile.autoCheckoutOff")}
          />
        </InfoRow>
      </div>
    </Card>
  )
}

export default function OrganizationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const canManage = useAuthStore((s) => s.hasPermission("manage_users"))
  // Returns 204 (empty body) on the platform-wide view -> falsy data.
  const { data, isLoading } = useResource<OrganizationProfile>("organization")
  const { data: heatmap } = useResource<ActivityHeatmapPoint[]>("organization/heatmap")

  // Selected heatmap day -> filter the activity timeline to that date.
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const { data: dayActivity } = useResource<AuditLogEntry[]>(
    "organization/activity",
    { date: selectedDate },
    { enabled: selectedDate != null },
  )

  const timelineEntries = selectedDate ? dayActivity ?? [] : data?.recentActivity ?? []
  const timelineTitle = selectedDate
    ? t("organizationProfile.activityOn", { date: formatLongDate(selectedDate) })
    : t("organizationProfile.timeline")

  const [tab, setTab] = useState<TabKey>("overview")

  const tabs: { key: TabKey; label: string; icon: typeof Building2 }[] = [
    { key: "overview", label: t("organizationProfile.tabs.overview"), icon: Building2 },
    { key: "attendance", label: t("organizationProfile.tabs.attendance"), icon: Clock },
    { key: "activity", label: t("organizationProfile.tabs.activity"), icon: History },
  ]

  return (
    <Page
      title={t("organizationProfile.title")}
      icon={Building2}
      description={t("organizationProfile.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("organizationProfile.title") },
      ]}
      loading={isLoading}
      actions={
        data ? (
          <div className="flex gap-2">
            {canManage && (
              <AppButton icon={Pencil} onClick={() => navigate("/organization/edit")}>
                {t("common.edit")}
              </AppButton>
            )}
            <AppButton variant="outline" icon={ArrowLeft} onClick={() => navigate("/dashboard")}>
              {t("common.back")}
            </AppButton>
          </div>
        ) : undefined
      }
    >
      {!data ? (
        <p className="text-sm text-muted-foreground">{t("organizationProfile.noActiveOrg")}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <Card className="flex-row items-center gap-4 rounded-none p-6">
            <Avatar icon={Building2} className="size-14" iconClassName="size-7" />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{data.name}</h2>
              <div className="mt-1">
                <StatusPill
                  active={data.isActive}
                  activeLabel={t("organizationProfile.active")}
                  inactiveLabel={t("organizationProfile.inactive")}
                />
              </div>
            </div>
          </Card>

          <div className="flex flex-wrap gap-1 border-b">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  tab === key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <Card className="gap-4 rounded-none p-6">
              <div className="flex flex-col gap-3">
                <InfoRow icon={Hash} label={t("organizationProfile.slug")}>{data.slug}</InfoRow>
                <InfoRow icon={CreditCard} label={t("organizationProfile.tier")}>
                  {data.subscriptionTier ?? t("common.dash")}
                </InfoRow>
                <InfoRow icon={Users} label={t("organizationProfile.members")}>{data.userCount}</InfoRow>
                <InfoRow icon={CalendarDays} label={t("organizationProfile.created")}>
                  {formatLongDate(data.createdAt)}
                </InfoRow>
              </div>
            </Card>
          )}

          {tab === "attendance" && <AttendanceSettingsCard profile={data} />}

          {tab === "activity" && (
            <div className="flex flex-col gap-6">
              <ContributionGraph
                title={t("organizationProfile.contributions")}
                points={heatmap ?? []}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
              <TimelineCard
                title={timelineTitle}
                entries={timelineEntries}
                emptyLabel={selectedDate ? t("organizationProfile.emptyDay") : t("organizationProfile.empty")}
                action={
                  selectedDate ? (
                    <AppButton variant="ghost" icon={X} onClick={() => setSelectedDate(null)}>
                      {t("organizationProfile.clearDay")}
                    </AppButton>
                  ) : undefined
                }
              />
            </div>
          )}
        </div>
      )}
    </Page>
  )
}
