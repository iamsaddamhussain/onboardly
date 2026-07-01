import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

interface DataTablePaginationProps {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  pageSizeOptions: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  disabled?: boolean
  /** Singular/plural noun for the count label, e.g. "user". */
  noun?: string
}

export function DataTablePagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  disabled,
  noun = "record",
}: DataTablePaginationProps) {
  const { t } = useTranslation()
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>{t("table.rowsPerPage")}</span>
        <select
          value={pageSize}
          disabled={disabled}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-none border bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          aria-label={t("table.rowsPerPage")}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4">
        <span>
          {totalCount === 0
            ? t("table.countEmpty", { noun })
            : t("table.showing", { from, to, total: totalCount })}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-none"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label={t("table.previousPage")}
          >
            <ChevronLeft />
          </Button>
          <span className="px-1 text-foreground">
            {t("table.pageOf", {
              page: totalPages === 0 ? 0 : page,
              total: totalPages,
            })}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="rounded-none"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label={t("table.nextPage")}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
