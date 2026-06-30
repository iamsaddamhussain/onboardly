import type { ReactNode } from "react"

export type ColumnAlign = "left" | "center" | "right"

// A fluent, chainable column definition. Holds only data + callbacks (no JSX),
// so it can live in a plain .ts module and be reused across the whole project.
export class Column<Row = Record<string, unknown>> {
  field: string
  label: string
  // The key sent to the server as `sortBy` (defaults to `field`).
  sortingColumn: string
  sortable = true
  visible = true
  align: ColumnAlign = "left"
  width?: string
  headerClassName = ""
  cellClassName = ""
  headerTooltip?: string
  formatter?: (value: unknown, row: Row) => ReactNode
  renderer?: (value: unknown, row: Row) => ReactNode

  constructor(field: string, label?: string) {
    this.field = field
    this.sortingColumn = field
    this.label = label ?? field
  }

  /** Disable sorting on this column (e.g. computed client-side columns). */
  unsortable(): this {
    this.sortable = false
    return this
  }

  /** Override which field the server sorts by when this header is clicked. */
  sortOn(field: string): this {
    this.sortingColumn = field
    return this
  }

  center(): this {
    this.align = "center"
    return this
  }

  right(): this {
    this.align = "right"
    return this
  }

  /** Fixed column width, including unit (e.g. "120px", "20%"). */
  setWidth(width: string): this {
    this.width = width
    return this
  }

  /** Replace the header cell classes. */
  headerClasses(classes: string): this {
    this.headerClassName = classes
    return this
  }

  /** Replace the body cell classes. */
  cellClasses(classes: string): this {
    this.cellClassName = classes
    return this
  }

  /** Render the cell value in muted text (common for secondary columns). */
  muted(): this {
    this.cellClassName = `${this.cellClassName} text-muted-foreground`.trim()
    return this
  }

  tooltip(label: string): this {
    this.headerTooltip = label
    return this
  }

  hidden(): this {
    this.visible = false
    return this
  }

  /** Map the raw value to a display string/node. Receives (value, row). */
  format(fn: (value: unknown, row: Row) => ReactNode): this {
    this.formatter = fn
    return this
  }

  /** Fully custom cell renderer. Receives (value, row). Wins over format(). */
  render(fn: (value: unknown, row: Row) => ReactNode): this {
    this.renderer = fn
    return this
  }

  /** Resolve what to display for a given row. */
  resolve(row: Row): ReactNode {
    const value = (row as Record<string, unknown>)[this.field]
    if (this.renderer) return this.renderer(value, row)
    if (this.formatter) return this.formatter(value, row)
    return value as ReactNode
  }
}

/** Create a new datatable column for chaining. */
export function column<Row = Record<string, unknown>>(
  field: string,
  label = "",
) {
  return new Column<Row>(field, label)
}
