import { Fragment, useMemo, useState } from "react"
import { Building2, Minus, Network, Plus, UsersRound } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { Page } from "@/components/Page"
import { Avatar } from "@/components/Avatar"
import { useResource } from "@/lib/query"
import { type OrgChartNode } from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { EmploymentStatusPill } from "@/pages/hr/employment"
import { cn } from "@/lib/utils"

// ─── Tree builder ────────────────────────────────────────────────────────────

interface TreeNode extends OrgChartNode {
  children: TreeNode[]
  descendantCount: number
}

function buildTree(nodes: OrgChartNode[]): { roots: TreeNode[]; byId: Map<number, TreeNode> } {
  const map = new Map<number, TreeNode>()
  nodes.forEach((n) => map.set(n.id, { ...n, children: [], descendantCount: 0 }))

  const roots: TreeNode[] = []
  map.forEach((node) => {
    const parent = node.reportingManagerId != null ? map.get(node.reportingManagerId) : null
    if (parent) parent.children.push(node)
    else roots.push(node)
  })

  // Sort children alphabetically and compute descendant counts bottom-up.
  const finalize = (list: TreeNode[]) => {
    list.sort((a, b) => a.fullName.localeCompare(b.fullName))
    list.forEach((n) => {
      finalize(n.children)
      n.descendantCount = n.children.reduce((sum, c) => sum + 1 + c.descendantCount, 0)
    })
  }
  finalize(roots)
  return { roots, byId: map }
}

// The manager chain above a node, ordered top-most first down to the direct
// manager (used by the Teams-style "my view").
function ancestorsOf(node: TreeNode, byId: Map<number, TreeNode>): TreeNode[] {
  const chain: TreeNode[] = []
  let current = node.reportingManagerId != null ? byId.get(node.reportingManagerId) : null
  while (current) {
    chain.unshift(current)
    current = current.reportingManagerId != null ? byId.get(current.reportingManagerId) : null
  }
  return chain
}

type Highlight = "root" | "self" | undefined

// ─── Node card ───────────────────────────────────────────────────────────────

function OrgCard({ node, highlight }: { node: TreeNode; highlight?: Highlight }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const initials = node.fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()

  return (
    <button
      type="button"
      onClick={() => navigate(`/employees/${node.id}`)}
      title={t("orgChart.viewProfile")}
      className={cn(
        "group relative flex w-56 flex-col items-center gap-2 border bg-background px-4 py-3 text-center shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        highlight === "root" && "border-primary/40 bg-primary/5",
        highlight === "self" && "border-primary ring-2 ring-primary",
      )}
    >
      {highlight === "self" && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
          {t("orgChart.you")}
        </span>
      )}
      <Avatar
        initials={initials}
        className={cn(
          "size-14 shrink-0 rounded-full text-base",
          (highlight === "root" || highlight === "self") && "bg-primary",
        )}
      />
      <div className="min-w-0 w-full">
        <p className="truncate text-sm font-semibold underline-offset-2 group-hover:underline">
          {node.fullName}
        </p>
        {node.jobTitleName && (
          <p className="truncate text-xs text-muted-foreground">{node.jobTitleName}</p>
        )}
        {node.departmentName && (
          <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Building2 className="size-3 shrink-0" />
            <span className="truncate">{node.departmentName}</span>
          </p>
        )}
      </div>
      <EmploymentStatusPill status={node.employmentStatus as never} />
    </button>
  )
}

// ─── Recursive node (top-down layout with connectors) ──────────────────────────

function OrgNode({
  node,
  depth,
  rootHighlight = "root",
}: {
  node: TreeNode
  depth: number
  rootHighlight?: Highlight
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children.length > 0
  const children = node.children

  return (
    <div className="flex flex-col items-center">
      {/* Card + expand/collapse toggle */}
      <div className="relative">
        <OrgCard node={node} highlight={depth === 0 ? rootHighlight : undefined} />
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? t("orgChart.collapse") : t("orgChart.expand")}
            className="absolute -bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground shadow-xs transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {expanded ? <Minus className="size-3" /> : <Plus className="size-3" />}
            {node.descendantCount}
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <>
          {/* Vertical line from parent down to the bus */}
          <div className="h-6 w-px bg-border" />

          {/* Children row */}
          <div className="flex items-start">
            {children.map((child, i) => {
              const isFirst = i === 0
              const isLast = i === children.length - 1
              const single = children.length === 1
              return (
                <div key={child.id} className="relative flex flex-col items-center px-4">
                  {/* Horizontal bus segment (trimmed at the ends) */}
                  {!single && (
                    <div
                      className={cn(
                        "absolute top-0 h-px bg-border",
                        isFirst ? "left-1/2 right-0" : isLast ? "left-0 right-1/2" : "left-0 right-0",
                      )}
                    />
                  )}
                  {/* Vertical line from bus down to child card */}
                  <div className="h-6 w-px bg-border" />
                  <OrgNode node={child} depth={depth + 1} rootHighlight={rootHighlight} />
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Search + filter bar ─────────────────────────────────────────────────────

function filterTree(nodes: TreeNode[], term: string): TreeNode[] {
  if (!term) return nodes
  const lower = term.toLowerCase()

  function matches(n: TreeNode): boolean {
    return (
      n.fullName.toLowerCase().includes(lower) ||
      (n.jobTitleName?.toLowerCase().includes(lower) ?? false) ||
      (n.departmentName?.toLowerCase().includes(lower) ?? false) ||
      n.employeeNumber.toLowerCase().includes(lower)
    )
  }

  function prune(n: TreeNode): TreeNode | null {
    const prunedChildren = n.children.map(prune).filter(Boolean) as TreeNode[]
    if (matches(n) || prunedChildren.length > 0)
      return { ...n, children: prunedChildren }
    return null
  }

  return nodes.map(prune).filter(Boolean) as TreeNode[]
}

// ─── Page ────────────────────────────────────────────────────────────────────

type ViewMode = "mine" | "full"

export default function OrgChartPage() {
  const { t } = useTranslation()
  const { data: nodes, isLoading } = useResource<OrgChartNode[]>("employees/org-chart")
  const currentUserId = useAuthStore((s) => s.user?.id)

  const [search, setSearch] = useState("")

  const { roots, byId } = useMemo(() => buildTree(nodes ?? []), [nodes])

  // The current user's own node, if they are linked to an employee record.
  const selfNode = useMemo(() => {
    if (currentUserId == null) return null
    for (const node of byId.values()) if (node.userId === currentUserId) return node
    return null
  }, [byId, currentUserId])

  const [mode, setMode] = useState<ViewMode>("mine")
  // Fall back to the full chart when the user has no place in the hierarchy.
  const effectiveMode: ViewMode = selfNode ? mode : "full"

  const managers = useMemo(
    () => (selfNode ? ancestorsOf(selfNode, byId) : []),
    [selfNode, byId],
  )

  const visible = useMemo(() => filterTree(roots, search), [roots, search])
  const total = nodes?.length ?? 0

  return (
    <Page
      title={t("orgChart.title")}
      icon={Network}
      description={t("orgChart.description")}
      breadcrumbs={[
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.humanResources") },
        { label: t("nav.orgChart") },
      ]}
      loading={isLoading}
    >
      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* View switcher */}
            {selfNode && (
              <div className="inline-flex border border-input">
                <button
                  type="button"
                  onClick={() => setMode("mine")}
                  className={cn(
                    "h-9 px-3 text-sm transition-colors",
                    effectiveMode === "mine"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t("orgChart.myView")}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("full")}
                  className={cn(
                    "h-9 border-l border-input px-3 text-sm transition-colors",
                    effectiveMode === "full"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t("orgChart.fullChart")}
                </button>
              </div>
            )}

            {/* Search (full chart only) */}
            {effectiveMode === "full" && (
              <div className="relative max-w-xs flex-1">
                <UsersRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-9 w-full border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  placeholder={t("orgChart.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {t("orgChart.total", { count: total })}
          </span>
        </div>

        {/* Chart */}
        {effectiveMode === "mine" && selfNode ? (
          <div className="overflow-x-auto pb-6">
            <div className="flex min-w-max flex-col items-center px-4 pt-2">
              {/* Manager chain above (top-most first, leading down to me) */}
              {managers.map((manager) => (
                <Fragment key={manager.id}>
                  <OrgCard node={manager} />
                  <div className="h-6 w-px bg-border" />
                </Fragment>
              ))}
              {/* Me + my reports */}
              <OrgNode node={selfNode} depth={0} rootHighlight="self" />
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Network className="size-12 opacity-30" />
            <p className="text-sm">{t("orgChart.empty")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-6">
            <div className="flex min-w-max justify-center gap-10 px-4 pt-2">
              {visible.map((root) => (
                <OrgNode key={root.id} node={root} depth={0} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Page>
  )
}
