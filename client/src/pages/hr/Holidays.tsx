import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CalendarCheck, Pencil, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import { Page } from "@/components/Page"
import { AppButton } from "@/components/AppButton"
import { ActionButton } from "@/components/ActionButton"
import { StatusPill } from "@/components/StatusPill"
import { FormSelect } from "@/components/FormSelect"
import { DataTable } from "@/components/datatable/DataTable"
import { column } from "@/components/datatable/column"
import { type HolidayRow } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { formatDate } from "@/lib/format"

function buildColumns(t: TFunction, canManage: boolean) {
  return [
    column<HolidayRow>("date", t("holidays.columns.date"))
      .sortOn("date")
      .render((_, row) => <span className="font-medium">{formatDate(row.date)}</span>),
    column<HolidayRow>("name", t("holidays.columns.name")).sortOn("name"),
    column<HolidayRow>("type", t("holidays.columns.type"))
      .unsortable()
      .muted()
      .format((value) => t(`holidayType.${value as string}`)),
    column<HolidayRow>("region", t("holidays.columns.region"))
      .unsortable()
      .muted()
      .format((value) => (value as string | null) ?? t("common.dash")),
    column<HolidayRow>("isActive", t("holidays.columns.status"))
      .sortOn("status")
      .render((value) => (
        <StatusPill
          active={Boolean(value)}
          activeLabel={t("common.active")}
          inactiveLabel={t("common.inactive")}
        />
      )),
    column<HolidayRow>("id", t("common.actions"))
      .unsortable()
      .right()
      .render((_, row) =>
        canManage ? (
          <div className="flex items-center justify-end">
            <ActionButton to={`/holidays/${row.id}/edit`} icon={Pencil}>
              {t("common.edit")}
            </ActionButton>
          </div>
        ) : null,
      ),
  ]
}

export default function HolidaysPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const canManage = useAuthStore((s) => s.hasPermission("holidays.manage"))

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState<string>(String(currentYear))

  const columns = useMemo(() => buildColumns(t, canManage), [t, canManage])
  const sendData = useMemo(() => (year ? { year: Number(year) } : {}), [year])

  const yearOptions = useMemo(() => {
    const opts = [{ value: "", label: t("holidays.allYears") }]
    for (let y = currentYear + 1; y >= currentYear - 3; y--)
      opts.push({ value: String(y), label: String(y) })
    return opts
  }, [currentYear, t])

  return (
    <Page
      title={t("holidays.title")}
      icon={CalendarCheck}
      description={t("holidays.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.leave") },
        { label: t("nav.holidays") },
      ]}
      actions={
        canManage ? (
          <AppButton icon={Plus} onClick={() => navigate("/holidays/new")}>
            {t("holidays.newHoliday")}
          </AppButton>
        ) : undefined
      }
    >
      <DataTable<HolidayRow>
        url="holidays"
        columns={columns}
        rowKey="id"
        sendData={sendData}
        defaults={{ sortBy: "date", sortDir: "asc", pageSize: 25 }}
        pageSizeOptions={[25, 50, 100]}
        searchPlaceholder={t("holidays.search")}
        emptyMessage={t("holidays.empty")}
        emptyIcon={CalendarCheck}
        countNoun={t("holidays.noun")}
        stickyHeader
        toolbar={
          <FormSelect
            id="year-filter"
            value={year}
            onValueChange={(v) => setYear((v as string) ?? "")}
            options={yearOptions}
            className="w-40"
          />
        }
      />
    </Page>
  )
}
