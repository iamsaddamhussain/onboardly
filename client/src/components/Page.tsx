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
    <div
      className={cn(
        "animate-page relative flex flex-col gap-6 overflow-hidden",
        className,
      )}
    >
      <FlowerBackdrop />
      {(title || description || actions) && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            {Icon && (
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center bg-muted text-foreground">
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
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

// Decorative flower watermark rendered behind page content. Purely cosmetic
// and ignored by assistive tech. Anchored top-right, hidden on small screens,
// and sized to the viewport so it never introduces overflow or layout shifts.
function FlowerBackdrop() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 320"
      preserveAspectRatio="xMaxYMin meet"
      className="pointer-events-none absolute -right-16 -top-6 -z-10 hidden h-[clamp(20rem,40vw,38rem)] text-primary lg:block"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      {/* main stem curving down */}
      <path d="M345 70 C345 160 320 230 320 320" strokeOpacity="0.06" />
      {/* upper sweeping branch + leaf */}
      <path d="M338 110 C260 110 120 130 30 230" strokeOpacity="0.06" />
      <path
        d="M338 110 C310 95 285 100 280 125 C300 138 332 130 338 110 Z"
        fill="currentColor"
        fillOpacity="0.07"
        stroke="none"
      />
      {/* lower sweeping branch + leaf */}
      <path d="M326 175 C250 175 110 200 30 300" strokeOpacity="0.06" />
      <path
        d="M326 175 C355 168 380 178 382 200 C360 212 332 200 326 175 Z"
        fill="currentColor"
        fillOpacity="0.07"
        stroke="none"
      />
      {/* flower head: one group opacity keeps overlaps even (no muddy centre) */}
      <g fill="currentColor" fillOpacity="0.07" stroke="none">
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <ellipse
            key={angle}
            cx="345"
            cy="35"
            rx="24"
            ry="42"
            transform={`rotate(${angle} 345 70)`}
          />
        ))}
      </g>
      <circle
        cx="345"
        cy="70"
        r="20"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="none"
      />
      <circle
        cx="345"
        cy="70"
        r="10"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="none"
      />
    </svg>
  )
}
