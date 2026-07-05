import type { ComponentProps, ComponentType } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Inline / table-row action button. Defaults to the ghost + small, square,
// pointer-cursor style used for row actions (edit, impersonate, activate…) and
// supports a `tone` for the common coloured variants. Pass `to` to render it as
// a router link (e.g. an "Edit" action that navigates to a details page).
export type ActionTone = "default" | "primary" | "destructive"

const toneClasses: Record<ActionTone, string> = {
  default: "",
  primary: "text-primary hover:bg-primary/10 hover:text-primary",
  destructive: "text-destructive hover:bg-destructive/10 hover:text-destructive",
}

interface ActionButtonProps extends Omit<ComponentProps<typeof Button>, "asChild"> {
  /** Optional leading icon (lucide component). */
  icon?: ComponentType<{ className?: string }>
  /** Colour treatment for the action. */
  tone?: ActionTone
  /** When set, the action renders as a router link to this path. */
  to?: string
}

export function ActionButton({
  icon: Icon,
  tone = "default",
  to,
  variant = "ghost",
  size = "sm",
  className,
  children,
  ...props
}: ActionButtonProps) {
  const classes = cn("cursor-pointer rounded-none", toneClasses[tone], className)
  const content = (
    <>
      {Icon && <Icon />}
      {children}
    </>
  )

  if (to) {
    return (
      <Button asChild variant={variant} size={size} className={classes} {...props}>
        <Link to={to}>{content}</Link>
      </Button>
    )
  }

  return (
    <Button variant={variant} size={size} className={classes} {...props}>
      {content}
    </Button>
  )
}
