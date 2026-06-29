import { Link, useNavigate } from "react-router-dom"
import { Pencil, Plus, Users } from "lucide-react"

import { Page } from "@/components/Page"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/datatable/DataTable"
import { column } from "@/components/datatable/column"
import { type ManagedUser } from "@/lib/api"
import { cn } from "@/lib/utils"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const columns = [
  column<ManagedUser>("isActive", "Status")
    .sortOn("status")
    .render((value) => (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium",
          value ? "text-emerald-500" : "text-muted-foreground",
        )}
      >
        <span
          className={cn(
            "size-2",
            value ? "bg-emerald-500" : "bg-muted-foreground/50",
          )}
        />
        {value ? "Active" : "Inactive"}
      </span>
    )),
  column<ManagedUser>("name", "Name")
    .sortOn("name")
    .render((_, row) => (
      <span className="font-medium">
        {row.firstName} {row.lastName}
      </span>
    )),
  column<ManagedUser>("email", "Email").muted(),
  column<ManagedUser>("city", "City")
    .muted()
    .format((value) => (value as string | null) ?? "—"),
  column<ManagedUser>("jobTitle", "Job Title")
    .muted()
    .format((value) => (value as string | null) ?? "—"),
  column<ManagedUser>("createdAt", "Joined")
    .sortOn("joined")
    .muted()
    .format((value) => formatDate(value as string)),
  column<ManagedUser>("mobile", "Mobile")
    .unsortable()
    .muted()
    .format((value) => (value as string | null) ?? "—"),
  column<ManagedUser>("id", "Actions")
    .unsortable()
    .right()
    .render((_, row) => (
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="rounded-none"
      >
        <Link to={`/users/${row.id}/edit`}>
          <Pencil /> Edit
        </Link>
      </Button>
    )),
]

export default function UsersPage() {
  const navigate = useNavigate()

  return (
    <Page
      title="Users"
      icon={Users}
      description="Manage the people in your workspace."
      breadcrumbs={[
        { label: "Dashboard", to: "/dashboard" },
        { label: "Users" },
      ]}
      actions={
        <Button className="rounded-none" onClick={() => navigate("/users/new")}>
          <Plus /> New User
        </Button>
      }
    >
      <DataTable<ManagedUser>
        url="users"
        columns={columns}
        rowKey="id"
        defaults={{ sortBy: "joined", sortDir: "desc", pageSize: 10 }}
        pageSizeOptions={[10, 25, 50, 100]}
        searchPlaceholder="Search users…"
        emptyMessage="No users found."
        emptyIcon={Users}
        countNoun="user"
        stickyHeader
        fullPageLoading
      />
    </Page>
  )
}
