import { useState } from "react"
import { Building2, Plus, Power, PowerOff } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Page } from "@/components/Page"
import { Card } from "@/components/ui/card"
import { AppButton } from "@/components/AppButton"
import { ActionButton } from "@/components/ActionButton"
import { StatusPill } from "@/components/StatusPill"
import { FormInput } from "@/components/FormInput"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/components/datatable/DataTable"
import { column } from "@/components/datatable/column"
import { api, type OrganizationRow } from "@/lib/api"
import { useResourceMutation } from "@/lib/query"
import { formatDate } from "@/lib/format"
import { optional } from "@/lib/utils"

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
        <StatusPill
          active={Boolean(value)}
          activeLabel={t("organizations.active")}
          inactiveLabel={t("organizations.inactive")}
        />
      )),
    column<OrganizationRow>("id", t("organizations.columns.actions"))
      .unsortable()
      .right()
      .render((_, row) => (
        <div className="flex items-center justify-end">
          <ActionButton
            disabled={toggling}
            icon={row.isActive ? PowerOff : Power}
            onClick={() => onToggle(row)}
          >
            {row.isActive ? t("organizations.deactivate") : t("organizations.activate")}
          </ActionButton>
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
    const name_ = name.trim()
    if (!name_) return
    createOrganization.mutate(
      { name: name_, subscriptionTier: optional(tier) },
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
            <FormInput
              id="newOrg"
              className="flex-1"
              placeholder={t("organizations.namePlaceholder")}
              value={name}
              onValueChange={(v) => setName((v as string) ?? "")}
            />
            <FormInput
              className="sm:max-w-56"
              placeholder={t("organizations.tierPlaceholder")}
              value={tier}
              onValueChange={(v) => setTier((v as string) ?? "")}
            />
            <AppButton
              icon={Plus}
              loading={createOrganization.isPending}
              disabled={!name.trim()}
              onClick={handleCreate}
            >
              {t("organizations.add")}
            </AppButton>
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
