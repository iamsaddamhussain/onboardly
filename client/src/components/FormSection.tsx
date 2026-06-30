import { useState, type ComponentType, type ReactNode } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface FormSectionProps {
  /** Optional anchor id for the section. */
  id?: string
  /** Section heading. */
  title?: string
  /** Optional icon shown next to the title (lucide component). */
  icon?: ComponentType<{ className?: string }>
  /** Optional supporting text under the title. */
  subtitle?: string
  /** Optional leading number, e.g. "1. Client". */
  sectionNumber?: number
  /** Hide the collapse button (section is always open). */
  noCollapse?: boolean
  /** Start collapsed. */
  defaultCollapsed?: boolean
  /** Remove horizontal padding on the content container. */
  edgeToEdge?: boolean
  /** Extra controls rendered on the right of the header. */
  headingContent?: ReactNode
  /** Section body. */
  children: ReactNode
  className?: string
}

export function FormSection({
  id,
  title,
  icon: Icon,
  subtitle,
  sectionNumber,
  noCollapse = false,
  defaultCollapsed = false,
  edgeToEdge = false,
  headingContent,
  children,
  className,
}: FormSectionProps) {
  const [shown, setShown] = useState(!defaultCollapsed)

  return (
    <Card id={id} className={cn("gap-0 rounded-none p-0", className)}>
      {(title || headingContent) && (
        <div className="flex items-center justify-between gap-4 border-b px-6 py-4">
          <div className="flex items-center gap-2">
            {!noCollapse && (
              <button
                type="button"
                onClick={() => setShown((v) => !v)}
                className="flex size-7 items-center justify-center text-primary hover:bg-muted"
                aria-expanded={shown}
                aria-label={shown ? "Collapse section" : "Expand section"}
              >
                {shown ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
            )}
            {Icon && <Icon className="size-5 text-primary" />}
            <div>
              <h2 className="flex items-center gap-1 text-base font-semibold text-primary">
                {sectionNumber != null && <span>{sectionNumber}.</span>}
                {title}
              </h2>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          {headingContent}
        </div>
      )}

      {shown && (
        <div className={cn("flex flex-col gap-6 py-6", !edgeToEdge && "px-6")}>
          {children}
        </div>
      )}
    </Card>
  )
}
