import type { ReactNode } from "react"

// Renders a wrapped list of small "chip" badges (e.g. a user's roles). Single
// responsibility — turning a list of labels into badges, with a fallback node
// when the list is empty. Reusable across any table column that shows tags.
interface BadgeListProps {
  items: string[]
  empty?: ReactNode
}

export function BadgeList({ items, empty = null }: BadgeListProps) {
  if (items.length === 0) return <>{empty}</>
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center rounded-none bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  )
}
