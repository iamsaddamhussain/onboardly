import { useState } from "react"
import { Building2, Plus, Power, PowerOff } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Page } from "@/components/Page"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/components/datatable/DataTable"
import { column } from "@/components/datatable/column"
import { api, type OrganizationRow } from "@/lib/api"
import { useResourceMutation } from "@/lib/query"
import { cn } from "@/lib/utils"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function buildColumns(
  t: TFunction,
  onToggle: (row: OrganizationRow) => void,
  toggling: boolean,
) {
  return [
    column<OrganizationRow>("name", t("organizations.columns.name"))
      .sortOn("name")
      .render((_, row) => <span className="font-medium">{row.name}</span>),
    column<OrganizationRow>("slug", t("organizations.columns.slug")).muted(),
    column<OrganizationRow>("subscriptionTier", t("organizations.columns.tier"))
      .unsortable()
      .muted()
      .format((value) => (value as string | null) ?? t("common.dash")),
    column<OrganizationRow>("userCount", t("organizations.columns.users"))
      .unsortable()
      .center(),
    column<OrganizationRow>("createdAt", t("organizations.columns.created"))
      .sortOn("createdAt")
      .muted()
      .format((value) => formatDate(value as string)),
    column<OrganizationRow>("isActive", t("organizations.columns.status"))
      .sortOn("status")
      .render((value) => (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium",
            value ? "text-emerald-500" : "text-muted-foreground",
          )}
        >
          <span className={cn("size-2", value ? "bg-emerald-500" : "bg-muted-foreground/50")} />
          {value ? t("organizations.active") : t("organizations.inactive")}
        </span>
      )),
    column<OrganizationRow>("id", t("organizations.columns.actions"))
      .unsortable()
      .right()
      .render((_, row) => (
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            disabled={toggling}
            className="cursor-pointer rounded-none"
            onClick={() => onToggle(row)}
          >
            {row.isActive ? <PowerOff /> : <Power />}
            {row.isActive ? t("organizations.deactivate") : t("organizations.activate")}
          </Button>
        </div>
      )),
  ]
}

export default function OrganizationsPage() {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [tier, setTier] = useState("")

  const createOrganization = useResourceMutation(
    (input: { name: string; subscriptionTier?: string }) => api.createOrganization(input),
    ["organizations"],
  )
  const updateOrganization = useResourceMutation(
    (input: { id: number; row: OrganizationRow }) =>
      api.updateOrganization(input.id, {
        name: input.row.name,
        isActive: !input.row.isActive,
        subscriptionTier: input.row.subscriptionTier ?? undefined,
      }),
    ["organizations"],
  )

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    createOrganization.mutate(
      { name: trimmed, subscriptionTier: tier.trim() || undefined },
      {
        onSuccess: () => {
          setName("")
          setTier("")
        },
      },
    )
  }

  const columns = buildColumns(
    t,
    (row) => updateOrganization.mutate({ id: row.id, row }),
    updateOrganization.isPending,
  )

  return (
    <Page
      title={t("organizations.title")}
      icon={Building2}
      description={t("organizations.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.organizations") },
      ]}
    >
      <div className="flex flex-col gap-4">
        <Card className="gap-3 rounded-none p-5">
          <Label htmlFor="newOrg">{t("organizations.newOrganization")}</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="newOrg"
              className="rounded-none"
              placeholder={t("organizations.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              className="rounded-none sm:max-w-56"
              placeholder={t("organizations.tierPlaceholder")}
              value={tier}
              onChange={(e) => setTier(e.target.value)}
            />
            <Button
              className="rounded-none"
              disabled={!name.trim() || createOrganization.isPending}
              onClick={handleCreate}
            >
              <Plus /> {t("organizations.add")}
            </Button>
          </div>
        </Card>

        <DataTable<OrganizationRow>
          url="organizations"
          columns={columns}
          rowKey="id"
          defaults={{ sortBy: "name", sortDir: "asc", pageSize: 25 }}
          pageSizeOptions={[25, 50, 100]}
          searchPlaceholder={t("organizations.search")}
          emptyMessage={t("organizations.empty")}
          emptyIcon={Building2}
          countNoun={t("organizations.noun")}
          stickyHeader
        />
      </div>
    </Page>
  )
}
