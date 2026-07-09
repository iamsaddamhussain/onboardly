import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"

// A responsive grid of labelled switches. Single responsibility — turning a
// list of items into an accessible on/off grid, so the markup lives in one
// place instead of being repeated per feature (roles, permissions, etc.).
export interface ToggleListItem {
  id: number | string
  label: string
  checked: boolean
  disabled?: boolean
}

interface ToggleListProps {
  items: ToggleListItem[]
  onToggle: (id: number | string, checked: boolean) => void
  className?: string
}

export function ToggleList({ items, onToggle, className }: ToggleListProps) {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <label key={item.id} className="flex items-center gap-2 text-sm">
          <Switch
            checked={item.checked}
            disabled={item.disabled}
            onCheckedChange={(checked) => onToggle(item.id, checked)}
          />
          {item.label}
        </label>
      ))}
    </div>
  )
}
