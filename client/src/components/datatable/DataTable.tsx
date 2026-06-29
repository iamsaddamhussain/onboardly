import { type ComponentType, type ReactNode } from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown, Inbox, Search } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Column } from "@/components/datatable/column"
import {
  useDataTable,
  type DataTableDefaults,
} from "@/components/datatable/useDataTable"
import { DataTablePagination } from "@/components/datatable/DataTablePagination"

export interface DataTableProps<Row> {
  /** Resource endpoint relative to /api (e.g. "users"). */
  url: string
  columns: Column<Row>[]
  /** Field on each row used as its React key. */
  rowKey?: string
  /** Extra params merged into every request (filters etc.). */
  sendData?: Record<string, unknown>
  defaults?: DataTableDefaults
  pageSizeOptions?: number[]
  searchable?: boolean
  searchPlaceholder?: string
  stickyHeader?: boolean
  onRowClick?: (row: Row) => void
  emptyMessage?: string
  /** Noun for the count label, e.g. "user" -> "Showing 1–10 of 42". */
  countNoun?: string
  /** Icon shown in the empty state. */
  emptyIcon?: ComponentType<{ className?: string }>
  /** Extra controls rendered next to the search box. */
  toolbar?: ReactNode
  /** Content rendered between the toolbar and the table (e.g. applied filters). */
  beforeTable?: ReactNode
}

const alignClass: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

export function DataTable<Row>({
  url,
  columns,
  rowKey = "id",
  sendData,
  defaults,
  pageSizeOptions = [15, 50, 100, 200],
  searchable = true,
  searchPlaceholder = "Search this table…",
  stickyHeader = false,
  onRowClick,
  emptyMessage = "No records found.",
  countNoun = "record",
  emptyIcon: EmptyIcon = Inbox,
  toolbar,
  beforeTable,
}: DataTableProps<Row>) {
  const table = useDataTable<Row>({ url, sendData, defaults })
  const visibleColumns = columns.filter((col) => col.visible)
  const colCount = visibleColumns.length

  return (
    <div className="flex flex-col gap-3">
      {(searchable || toolbar) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={table.searchInput}
                onChange={(e) => table.setSearchInput(e.target.value)}
                className="rounded-none pl-9"
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      {beforeTable}

      <Card className="gap-0 overflow-hidden rounded-none p-0">
        {/* Thin loading indicator that doesn't shift layout. */}
        <div className="h-0.5 w-full overflow-hidden">
          {table.isFetching && (
            <div className="h-full w-1/3 animate-pulse bg-primary" />
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead
              className={cn(
                "border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground",
                stickyHeader && "sticky top-0 z-10",
              )}
            >
              <tr>
                {visibleColumns.map((col) => (
                  <th
                    key={col.field}
                    style={col.width ? { width: col.width } : undefined}
                    className={cn(
                      "px-4 py-3 font-medium",
                      alignClass[col.align],
                      col.headerClassName,
                    )}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => table.toggleSort(col.sortingColumn)}
                        title={col.headerTooltip}
                        className={cn(
                          "flex items-center gap-1.5 uppercase hover:text-foreground",
                          col.align === "center" && "justify-center",
                          col.align === "right" && "justify-end",
                          col.align !== "left" && "w-full",
                        )}
                      >
                        {col.label}
                        <SortIcon
                          active={table.sortBy === col.sortingColumn}
                          dir={table.sortDir}
                        />
                      </button>
                    ) : (
                      <span title={col.headerTooltip}>{col.label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.isFetching && table.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Loading…
                  </td>
                </tr>
              ) : table.rows.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground" aria-label={emptyMessage}>
                      <EmptyIcon className="size-12 opacity-40" />
                    </div>
                  </td>
                </tr>
              ) : (
                table.rows.map((row) => (
                  <tr
                    key={String((row as Record<string, unknown>)[rowKey])}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "border-b last:border-0 hover:bg-muted/30",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {visibleColumns.map((col) => (
                      <td
                        key={col.field}
                        className={cn(
                          "px-4 py-3",
                          alignClass[col.align],
                          col.cellClassName,
                        )}
                      >
                        {col.resolve(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <DataTablePagination
          page={table.page}
          pageSize={table.pageSize}
          totalCount={table.totalCount}
          totalPages={table.totalPages}
          pageSizeOptions={pageSizeOptions}
          onPageChange={table.setPage}
          onPageSizeChange={table.changePageSize}
          disabled={table.isFetching}
          noun={countNoun}
        />
      </Card>
    </div>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown className="size-3.5 opacity-40" />
  return dir === "asc" ? (
    <ArrowUp className="size-3.5" />
  ) : (
    <ArrowDown className="size-3.5" />
  )
}
