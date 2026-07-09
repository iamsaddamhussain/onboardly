import { CalendarIcon, X } from "lucide-react"
import dayjs from "dayjs"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  /** Controlled value as an ISO calendar day (YYYY-MM-DD), or "" when empty. */
  value: string
  /** Emits the new YYYY-MM-DD string (or "" when cleared). */
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  disabled?: boolean
  /** Allow clearing the value with an inline button. */
  clearable?: boolean
  "aria-invalid"?: boolean
  className?: string
  /** Optional min/max bounds as YYYY-MM-DD. */
  min?: string
  max?: string
}

// Convert a local Date to a timezone-safe YYYY-MM-DD key.
function toKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

// Parse a YYYY-MM-DD key into a local Date (no timezone shift).
function fromKey(value: string): Date | undefined {
  if (!value) return undefined
  const [y, m, d] = value.split("-").map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

// A shadcn-style date picker: a button trigger showing the selected date, and a
// Radix Popover housing the Calendar. Emits date-only strings so it drops into
// the existing forms in place of a native <input type="date">.
export function DatePicker({
  value,
  onChange,
  placeholder,
  id,
  disabled,
  clearable = true,
  "aria-invalid": ariaInvalid,
  className,
  min,
  max,
}: DatePickerProps) {
  const { t } = useTranslation()
  const selected = fromKey(value)

  return (
    <Popover>
      <div className={cn("relative", className)}>
        <PopoverTrigger
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={cn(
            "flex h-9 w-full items-center gap-2 border border-input bg-background px-3 py-1 text-left text-sm shadow-xs outline-none transition-[color,box-shadow]",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn("flex-1 truncate", !selected && "text-muted-foreground")}>
            {selected ? dayjs(selected).format("ll") : placeholder ?? t("datePicker.placeholder")}
          </span>
          {clearable && selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label={t("datePicker.clear")}
              className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onChange("")
              }}
            >
              <X className="size-3.5" />
            </span>
          )}
        </PopoverTrigger>
      </div>
      <PopoverContent align="start" className="p-0">
        <Calendar
          mode="single"
          autoFocus
          selected={selected}
          defaultMonth={selected}
          disabled={[
            ...(min ? [{ before: fromKey(min)! }] : []),
            ...(max ? [{ after: fromKey(max)! }] : []),
          ]}
          onSelect={(date) => onChange(date ? toKey(date) : "")}
        />
      </PopoverContent>
    </Popover>
  )
}
