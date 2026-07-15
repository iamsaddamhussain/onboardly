import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  History,
  IdCard,
  Mail,
  Network,
  Pencil,
  Phone,
  UserRound,
  UsersRound,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Page } from "@/components/Page"
import { Card } from "@/components/ui/card"
import { AppButton } from "@/components/AppButton"
import { Avatar } from "@/components/Avatar"
import { TimelineCard } from "@/components/TimelineCard"
import { LeaveBalanceCard } from "@/components/LeaveBalanceCard"
import { useResource } from "@/lib/query"
import { type AuditLogEntry, type EmployeeDetail, type LeaveBalanceSummary } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { formatLongDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { EmploymentStatusPill } from "@/pages/hr/employment"

type TabKey = "profile" | "employment" | "organization" | "leave" | "activity"

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof IdCard
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="w-40 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  )
}

function ProfileTab({ e, t }: { e: EmployeeDetail; t: TFunction }) {
  return (
    <Card className="gap-4 rounded-none p-6">
      <InfoRow icon={IdCard} label={t("employeeForm.employeeNumber")}>
        <span className="font-mono text-xs">{e.employeeNumber}</span>
      </InfoRow>
      <InfoRow icon={UserRound} label={t("employeeProfile.name")}>{e.fullName}</InfoRow>
      <InfoRow icon={Mail} label={t("employeeProfile.accountEmail")}>{e.email}</InfoRow>
      <InfoRow icon={Mail} label={t("employeeForm.workEmail")}>
        {e.workEmail ?? t("common.dash")}
      </InfoRow>
      <InfoRow icon={Phone} label={t("employeeForm.workPhone")}>
        {e.workPhone ?? t("common.dash")}
      </InfoRow>
      <InfoRow icon={UserRound} label={t("employeeForm.notes")}>
        {e.notes ?? t("common.dash")}
      </InfoRow>
    </Card>
  )
}

function EmploymentTab({ e, t }: { e: EmployeeDetail; t: TFunction }) {
  return (
    <Card className="gap-4 rounded-none p-6">
      <InfoRow icon={Briefcase} label={t("employeeForm.jobTitle")}>
        {e.jobTitleName ?? t("common.dash")}
      </InfoRow>
      <InfoRow icon={Briefcase} label={t("employeeProfile.employmentType")}>
        {t(`employment.type.${e.employmentType}`)}
      </InfoRow>
      <InfoRow icon={Briefcase} label={t("employeeProfile.employmentStatus")}>
        <EmploymentStatusPill status={e.employmentStatus} />
      </InfoRow>
      <InfoRow icon={CalendarDays} label={t("employeeForm.joiningDate")}>
        {formatLongDate(e.joiningDate)}
      </InfoRow>
      <InfoRow icon={CalendarClock} label={t("employeeForm.leaveEligible")}>
        {e.leaveEligible ? t("common.yes") : t("common.no")}
      </InfoRow>
    </Card>
  )
}

function OrganizationTab({ e, t }: { e: EmployeeDetail; t: TFunction }) {
  return (
    <Card className="gap-4 rounded-none p-6">
      <InfoRow icon={Network} label={t("employeeForm.department")}>
        {e.departmentName ?? t("common.dash")}
      </InfoRow>
      <InfoRow icon={UsersRound} label={t("employeeForm.manager")}>
        {e.reportingManagerName ?? t("common.dash")}
      </InfoRow>
      <InfoRow icon={Briefcase} label={t("employeeForm.jobTitle")}>
        {e.jobTitleName ?? t("common.dash")}
      </InfoRow>
    </Card>
  )
}

function ActivityTab({ id, t }: { id: number; t: TFunction }) {
  const { data } = useResource<AuditLogEntry[]>(`employees/${id}/activity`)
  return (
    <TimelineCard
      title={t("employeeProfile.activity")}
      entries={data ?? []}
      emptyLabel={t("employeeProfile.noActivity")}
    />
  )
}

function LeaveTab({ id, t }: { id: number; t: TFunction }) {
  const { data } = useResource<LeaveBalanceSummary[]>(`leave-balances/employee/${id}`)
  const balances = data ?? []

  if (balances.length === 0) {
    return (
      <Card className="rounded-none p-6 text-sm text-muted-foreground">
        {t("employeeProfile.noBalances")}
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {balances.map((b) => (
        <LeaveBalanceCard key={b.leaveTypeId} balance={b} />
      ))}
    </div>
  )
}

export default function EmployeeProfilePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { id } = useParams()
  const employeeId = id ? Number(id) : null
  const invalidId = employeeId == null || Number.isNaN(employeeId)
  const canEdit = useAuthStore((s) => s.hasPermission("employees.edit"))
  const canViewActivity = useAuthStore((s) => s.hasPermission("employees.view"))
  const canViewLeave = useAuthStore((s) =>
    s.hasPermission("leave.view") ||
    s.hasPermission("leave.approve") ||
    s.hasPermission("leave.manage_balances"),
  )
  const canViewList = canViewActivity
  const backTo = canViewList ? "/employees" : "/org-chart"

  const [tab, setTab] = useState<TabKey>("profile")

  const { data, isLoading, isError } = useResource<EmployeeDetail>(
    `employees/${employeeId}`,
    {},
    { enabled: !invalidId },
  )

  useEffect(() => {
    if (invalidId || isError) navigate(backTo, { replace: true })
  }, [invalidId, isError, navigate, backTo])

  const tabs: { key: TabKey; label: string; icon: typeof IdCard }[] = [
    { key: "profile", label: t("employeeProfile.tabs.profile"), icon: UserRound },
    { key: "employment", label: t("employeeProfile.tabs.employment"), icon: Briefcase },
    { key: "organization", label: t("employeeProfile.tabs.organization"), icon: Building2 },
    ...(canViewLeave
      ? [{ key: "leave" as const, label: t("employeeProfile.tabs.leave"), icon: CalendarClock }]
      : []),
    ...(canViewActivity
      ? [{ key: "activity" as const, label: t("employeeProfile.tabs.activity"), icon: History }]
      : []),
  ]

  return (
    <Page
      title={data?.fullName ?? t("employeeProfile.title")}
      icon={UsersRound}
      description={data ? data.employeeNumber : undefined}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        ...(canViewList ? [{ label: t("nav.employees"), to: "/employees" }] : []),
        { label: data?.fullName ?? t("employeeProfile.title") },
      ]}
      loading={isLoading}
      actions={
        <div className="flex gap-2">
          {canEdit && data && (
            <AppButton icon={Pencil} onClick={() => navigate(`/employees/${data.id}/edit`)}>
              {t("common.edit")}
            </AppButton>
          )}
          <AppButton variant="outline" icon={ArrowLeft} onClick={() => navigate(backTo)}>
            {t("common.back")}
          </AppButton>
        </div>
      }
    >
      {data && (
        <div className="flex flex-col gap-6">
          <Card className="flex-row items-center gap-4 rounded-none p-6">
            <Avatar icon={UserRound} className="size-14" iconClassName="size-7" />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{data.fullName}</h2>
              <div className="mt-1 flex items-center gap-3">
                <EmploymentStatusPill status={data.employmentStatus} />
                <span className="text-xs text-muted-foreground">
                  {data.jobTitleName ?? t("employeeProfile.noJobTitle")}
                </span>
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

          {tab === "profile" && <ProfileTab e={data} t={t} />}
          {tab === "employment" && <EmploymentTab e={data} t={t} />}
          {tab === "organization" && <OrganizationTab e={data} t={t} />}
          {tab === "leave" && canViewLeave && <LeaveTab id={data.id} t={t} />}
          {tab === "activity" && canViewActivity && <ActivityTab id={data.id} t={t} />}
        </div>
      )}
    </Page>
  )
}
