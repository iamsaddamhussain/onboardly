import { useEffect, useMemo, useState } from "react"

import { useResource } from "@/lib/query"
import type { PagedResult } from "@/lib/api"

export interface DataTableDefaults {
  sortBy?: string
  sortDir?: "asc" | "desc"
  pageSize?: number
}

export interface UseDataTableOptions {
  /** Resource endpoint relative to /api (e.g. "users"). */
  url: string
  /** Extra params merged into every request (filters etc.). */
  sendData?: Record<string, unknown>
  defaults?: DataTableDefaults
  /** Debounce (ms) applied to the search box. */
  searchDebounce?: number
}

// Owns all server-side table state (search, sort, paging) and the data fetch.
// Single responsibility: state + data. Presentation lives in <DataTable>.
export function useDataTable<Row>(options: UseDataTableOptions) {
  const { url, sendData, defaults, searchDebounce = 350 } = options

  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState(defaults?.sortBy ?? "id")
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    defaults?.sortDir ?? "asc",
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaults?.pageSize ?? 15)

  // Debounce the search box, resetting to page 1 when the term changes.
  useEffect(() => {
    const id = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput)
        setPage(1)
      }
    }, searchDebounce)
    return () => clearTimeout(id)
  }, [searchInput, search, searchDebounce])

  // Reset to page 1 when external filters change (compared by value).
  const sendDataKey = JSON.stringify(sendData ?? {})
  useEffect(() => {
    setPage(1)
  }, [sendDataKey])

  const params = useMemo(
    () => ({ ...sendData, search, sortBy, sortDir, page, pageSize }),
    [sendData, search, sortBy, sortDir, page, pageSize],
  )

  const query = useResource<PagedResult<Row>>(url, params)

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))
    } else {
      setSortBy(field)
      setSortDir("asc")
    }
    setPage(1)
  }

  function changePageSize(size: number) {
    setPageSize(size)
    setPage(1)
  }

  const data = query.data
  return {
    rows: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 0,
    page,
    setPage,
    pageSize,
    changePageSize,
    searchInput,
    setSearchInput,
    sortBy,
    sortDir,
    toggleSort,
    isFetching: query.isFetching,
    refetch: query.refetch,
  }
}
