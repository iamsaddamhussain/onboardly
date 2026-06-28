import { type ComponentType, type ReactNode } from "react"

import { cn } from "@/lib/utils"

interface PageProps {
  /** Optional page heading. */
  title?: string
  /** Optional icon shown next to the heading. */
  icon?: ComponentType<{ className?: string }>
  /** Optional supporting text under the heading. */
  description?: string
  /** Optional actions rendered on the right of the header (buttons, etc.). */
  actions?: ReactNode
  /** When true, shows a centered spinner instead of the content. */
  loading?: boolean
  children: ReactNode
  className?: string
}

// Common wrapper for every page. Provides the default enter transition and a
// consistent header + spacing, so new pages get all of this for free:
//
//   export default function MyPage() {
//     return <Page title="My Page" description="...">{content}</Page>
//   }
export function Page({
  title,
  icon: Icon,
  description,
  actions,
  loading = false,
  children,
  className,
}: PageProps) {
  if (loading) {
    return (
      <div className={cn("animate-page text-primary", className)}>
        <span className="text-4xl font-semibold">Loading…</span>
      </div>
    )
  }

  return (
    <div className={cn("animate-page flex flex-col gap-6", className)}>
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {Icon && (
              <span className="mt-0.5 flex size-9 items-center justify-center bg-muted text-foreground">
                <Icon className="size-5" />
              </span>
            )}
            <div>
              {title && <h1 className="text-xl font-semibold">{title}</h1>}
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}
