import type { ComponentType, ReactNode } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// The standard, generic form input for the app. Bundles the label (with a
// required marker), the control, and an error/hint line so every field looks
// and behaves the same. Mirrors the FormInput used elsewhere: a single `value`
// binding, `required`/`readOnly` states, and number parsing built in.
export type FormInputType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "tel"
  | "url"
  | "textarea"

interface FormInputProps {
  /** Field label. Already-translated text. */
  label?: ReactNode
  /** Controlled value. */
  value: string | number | null | undefined
  /** Emits the new value: a number (or null) for `type="number"`, else a string. */
  onValueChange: (value: string | number | null) => void
  type?: FormInputType
  /** Show the required asterisk on the label. */
  required?: boolean
  readOnly?: boolean
  disabled?: boolean
  /** Validation message shown below the field (takes precedence over hint). */
  error?: string
  /** Helper text shown below the field when there's no error. */
  hint?: ReactNode
  placeholder?: string
  id?: string
  name?: string
  autoComplete?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  maxLength?: number
  min?: number
  max?: number
  step?: number | "any"
  /** Rows for `type="textarea"`. */
  rows?: number
  /** Optional leading icon (lucide component). */
  icon?: ComponentType<{ className?: string }>
  /** Content rendered at the end of the field row (e.g. a button/adornment). */
  append?: ReactNode
  /** Transform raw text before emitting (e.g. strip non-digits). Text types only. */
  transform?: (raw: string) => string
  className?: string
  inputClassName?: string
}

export function FormInput({
  label,
  value,
  onValueChange,
  type = "text",
  required = false,
  readOnly = false,
  disabled = false,
  error,
  hint,
  placeholder,
  id,
  name,
  autoComplete,
  inputMode,
  maxLength,
  min,
  max,
  step,
  rows = 3,
  icon: Icon,
  append,
  transform,
  className,
  inputClassName,
}: FormInputProps) {
  const controlId = id ?? name
  const isTextarea = type === "textarea"
  const describedBy = error || hint ? `${controlId ?? "field"}-desc` : undefined

  function emit(raw: string) {
    if (type === "number") {
      if (raw === "") return onValueChange(null)
      const parsed = parseFloat(raw)
      return onValueChange(Number.isNaN(parsed) ? null : parsed)
    }
    onValueChange(transform ? transform(raw) : raw)
  }

  const displayValue = value ?? ""
  const readOnlyClasses = readOnly && "border-transparent bg-transparent shadow-none"

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <Label htmlFor={controlId} required={required}>
          {label}
        </Label>
      )}

      <div className={cn(append && "flex items-center gap-2")}>
        {isTextarea ? (
          <textarea
            id={controlId}
            name={name}
            rows={rows}
            className={cn(
              "border-input placeholder:text-muted-foreground flex min-h-16 w-full rounded-none border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow]",
              "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
              "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
              readOnlyClasses,
              inputClassName,
            )}
            value={displayValue}
            placeholder={placeholder}
            readOnly={readOnly}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            onChange={(e) => emit(e.target.value)}
          />
        ) : (
          <div className="relative flex-1">
            {Icon && (
              <Icon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            )}
            <Input
              id={controlId}
              name={name}
              type={type}
              className={cn(
                "rounded-none",
                Icon && "pl-9",
                readOnlyClasses,
                inputClassName,
              )}
              value={displayValue}
              placeholder={placeholder}
              readOnly={readOnly}
              disabled={disabled}
              required={required}
              autoComplete={autoComplete}
              inputMode={inputMode}
              maxLength={maxLength}
              min={min}
              max={max}
              step={step}
              aria-invalid={!!error}
              aria-describedby={describedBy}
              onChange={(e) => emit(e.target.value)}
            />
          </div>
        )}
        {append}
      </div>

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
