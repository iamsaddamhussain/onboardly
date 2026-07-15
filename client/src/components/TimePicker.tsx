import { Clock, X } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface TimePickerProps {
  /** Controlled value as 24-hour "HH:mm", or "" when empty. */
  value: string
  /** Emits the new "HH:mm" string (or "" when cleared). */
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  disabled?: boolean
  /** Allow clearing the value with an inline button. */
  clearable?: boolean
  /** Minute step for the minute column (defaults to 5). */
  minuteStep?: number
  "aria-invalid"?: boolean
  className?: string
}

interface Parsed {
  hour12: number
  minute: number
  meridiem: "AM" | "PM"
}

// Parse a 24-hour "HH:mm" string into 12-hour parts.
function parse(value: string): Parsed | null {
  if (!value) return null
  const [h, m] = value.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const meridiem: "AM" | "PM" = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return { hour12, minute: m, meridiem }
}

// Build a 24-hour "HH:mm" string from 12-hour parts.
function toKey({ hour12, minute, meridiem }: Parsed): string {
  let h = hour12 % 12
  if (meridiem === "PM") h += 12
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

// Human-readable 12-hour label, e.g. "11:00 AM".
function label(parsed: Parsed): string {
  return `${parsed.hour12}:${String(parsed.minute).padStart(2, "0")} ${parsed.meridiem}`
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)

// A time picker mirroring DatePicker: a button trigger and a Popover with
// scrollable hour/minute columns plus AM/PM. Emits 24-hour "HH:mm" strings so
// it drops in for a native <input type="time">.
export function TimePicker({
  value,
  onChange,
  placeholder,
  id,
  disabled,
  clearable = true,
  minuteStep = 5,
  "aria-invalid": ariaInvalid,
  className,
}: TimePickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const parsed = parse(value)

  const minutes = Array.from(
    { length: Math.ceil(60 / minuteStep) },
    (_, i) => i * minuteStep,
  )

  // Emit a change, defaulting the other parts sensibly on first selection.
  function emit(next: Partial<Parsed>) {
    const base: Parsed = parsed ?? { hour12: 12, minute: 0, meridiem: "AM" }
    onChange(toKey({ ...base, ...next }))
  }

  const cellClass = (active: boolean) =>
    cn(
      "cursor-pointer px-3 py-1.5 text-center text-sm transition-colors",
      active
        ? "bg-accent font-medium text-accent-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          <Clock className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn("flex-1 truncate", !parsed && "text-muted-foreground")}>
            {parsed ? label(parsed) : placeholder ?? t("timePicker.placeholder")}
          </span>
          {clearable && parsed && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label={t("timePicker.clear")}
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
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex h-56 divide-x">
          <ul className="w-16 overflow-y-auto py-1">
            {HOURS.map((h) => (
              <li key={h}>
                <button
                  type="button"
                  className={cn("w-full", cellClass(parsed?.hour12 === h))}
                  onClick={() => emit({ hour12: h })}
                >
                  {h}
                </button>
              </li>
            ))}
          </ul>
          <ul className="w-16 overflow-y-auto py-1">
            {minutes.map((m) => (
              <li key={m}>
                <button
                  type="button"
                  className={cn("w-full", cellClass(parsed?.minute === m))}
                  onClick={() => emit({ minute: m })}
                >
                  {String(m).padStart(2, "0")}
                </button>
              </li>
            ))}
          </ul>
          <ul className="w-16 py-1">
            {(["AM", "PM"] as const).map((mer) => (
              <li key={mer}>
                <button
                  type="button"
                  className={cn("w-full", cellClass(parsed?.meridiem === mer))}
                  onClick={() => emit({ meridiem: mer })}
                >
                  {mer}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  )
}
