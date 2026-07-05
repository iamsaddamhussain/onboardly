import type { ReactNode } from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// The standard, generic select field for the app — the dropdown sibling of
// FormInput. Bundles the label (with a required marker), a native <select>, and
// an error/hint line so every dropdown looks and behaves the same.
export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

interface FormSelectProps {
  /** Field label. Already-translated text. */
  label?: ReactNode
  /** Controlled value (matched against option values). */
  value: string | number | null | undefined
  /** Emits the selected option's value (its original type), or null when cleared. */
  onValueChange: (value: string | number | null) => void
  options: SelectOption[]
  /** Text for a leading empty option; when omitted there is no empty choice. */
  placeholder?: string
  /** Show the required asterisk on the label. */
  required?: boolean
  disabled?: boolean
  /** Validation message shown below the field (takes precedence over hint). */
  error?: string
  /** Helper text shown below the field when there's no error. */
  hint?: ReactNode
  id?: string
  name?: string
  className?: string
  selectClassName?: string
}

export function FormSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  required = false,
  disabled = false,
  error,
  hint,
  id,
  name,
  className,
  selectClassName,
}: FormSelectProps) {
  const controlId = id ?? name
  const describedBy = error || hint ? `${controlId ?? "field"}-desc` : undefined

  function emit(raw: string) {
    if (raw === "") return onValueChange(null)
    // Preserve the option's original value type (e.g. number ids).
    const match = options.find((o) => String(o.value) === raw)
    onValueChange(match ? match.value : raw)
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <Label htmlFor={controlId} required={required}>
          {label}
        </Label>
      )}

      <select
        id={controlId}
        name={name}
        className={cn(
          "border-input flex h-9 w-full rounded-none border bg-background px-3 py-1 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow]",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          selectClassName,
        )}
        value={value == null ? "" : String(value)}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        onChange={(e) => emit(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>

      {error ? (
        <p id={describedBy} className="text-destructive text-xs">
          {error}
        </p>
      ) : hint ? (
        <p id={describedBy} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
