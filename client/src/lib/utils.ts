import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Trim a form value for submission. Used for required fields where an empty
// string is still a (invalid) value the server should reject.
export function trimmed(value: string): string {
  return value.trim()
}

// Trim an optional form value, collapsing a blank string to `undefined` so it
// is omitted from the payload rather than sent as "".
export function optional(value: string): string | undefined {
  return value.trim() || undefined
}
