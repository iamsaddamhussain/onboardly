import { Building2, CalendarDays, CreditCard, Hash, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Page } from "@/components/Page"
import { Card } from "@/components/ui/card"
import { TimelineCard } from "@/components/TimelineCard"
import { ContributionGraph } from "@/components/ContributionGraph"
import { Avatar } from "@/components/Avatar"
import { StatusPill } from "@/components/StatusPill"
import { useResource } from "@/lib/query"
import { type ActivityHeatmapPoint, type OrganizationProfile } from "@/lib/api"
import { formatLongDate } from "@/lib/format"

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

export default function OrganizationPage() {
  const { t } = useTranslation()
  // Returns 204 (empty body) on the platform-wide view -> falsy data.
  const { data, isLoading } = useResource<OrganizationProfile>("organization")
  const { data: heatmap } = useResource<ActivityHeatmapPoint[]>("organization/heatmap")

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
    >
      {!data ? (
        <p className="text-sm text-muted-foreground">{t("organizationProfile.noActiveOrg")}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <ContributionGraph
            title={t("organizationProfile.contributions")}
            points={heatmap ?? []}
          />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Card className="gap-5 rounded-none p-6">
              <div className="flex items-center gap-4">
                <Avatar icon={Building2} className="size-14" iconClassName="size-7" />
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">{data.name}</h2>
                  <StatusPill
                    active={data.isActive}
                    activeLabel={t("organizationProfile.active")}
                    inactiveLabel={t("organizationProfile.inactive")}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t pt-4">
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

            <TimelineCard
              title={t("organizationProfile.timeline")}
              entries={data.recentActivity}
              emptyLabel={t("organizationProfile.empty")}
            />
          </div>
        </div>
      )}
    </Page>
  )
}
