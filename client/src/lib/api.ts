// Axios client with centralised error handling.
//
// Every request sends the auth cookie (withCredentials). A single response
// interceptor turns any failure into a user-friendly toast and a normalised
// `ApiError`, so callers never need their own try/catch just to report errors:
//   - 401 -> trigger the registered "unauthorized" handler (redirect to login)
//   - everything else -> show a toast with the best available message
//
// Errors are still rejected so callers *can* react (e.g. skip a state update),
// but unhandled ApiErrors are silenced globally to avoid console noise.

import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios"
import { toast } from "sonner"

import i18n from "@/lib/i18n"

export class ApiError extends Error {
  status: number
  // Per-field validation messages (camelCase keys), when the server returns a
  // ValidationProblemDetails response.
  errors?: Record<string, string[]>
  // Flattened first-message-per-field map, ready to drop into a form's field
  // error state (so callers don't repeat the Object.entries reduce).
  fieldErrors: Record<string, string>
  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errors = errors
    this.fieldErrors = {}
    if (errors) {
      for (const [field, messages] of Object.entries(errors)) {
        if (messages?.length) this.fieldErrors[field] = messages[0]
      }
    }
  }
}

export interface User {
  id: number
  email: string
  language: string
  roles: string[]
  permissions: string[]
  firstName: string | null
  lastName: string | null
  // True while an admin is impersonating this user.
  impersonating: boolean
  // "global" (platform user) or "org" (tenant user).
  scope: string
  // The user's home tenant. Null for platform/global users.
  organizationId: number | null
  organizationName: string | null
  // Tenant a global user is currently viewing via the org selector, if any.
  activeOrganizationId: number | null
  activeOrganizationName: string | null
}

export interface Organization {
  id: number
  name: string
  slug: string
  isActive: boolean
}

// Row for the platform-admin organizations table.
export interface OrganizationRow {
  id: number
  name: string
  slug: string
  isActive: boolean
  subscriptionTier: string | null
  createdAt: string
  userCount: number
}

export interface CreateOrganizationInput {
  name: string
  slug?: string
  subscriptionTier?: string
}

export interface UpdateOrganizationInput {
  name: string
  isActive: boolean
  subscriptionTier?: string
}

// A single audit-trail row.
export interface AuditLogEntry {
  id: number
  organizationId: number | null
  userId: number | null
  action: string
  entityType: string
  entityId: string
  oldValues: string | null
  newValues: string | null
  timestamp: string
  ipAddress: string | null
  userAgent: string | null
}

// A single day's activity count for the contribution heatmap. The date is an
// ISO calendar day (YYYY-MM-DD) as serialized from the server's DateOnly.
export interface ActivityHeatmapPoint {
  date: string
  count: number
}

// Read-only company profile: the active organization's details + timeline.
export interface OrganizationProfile {
  id: number
  name: string
  slug: string
  isActive: boolean
  subscriptionTier: string | null
  createdAt: string
  userCount: number
  recentActivity: AuditLogEntry[]
}

export interface Profile {
  id: number
  firstName: string
  lastName: string
  email: string
  mobile: string | null
  city: string | null
  jobTitle: string | null
  language: string
  isActive: boolean
  createdAt: string
}

export interface UpdateProfileInput {
  firstName: string
  lastName: string
  mobile?: string
  city?: string
  jobTitle?: string
}

export interface ManagedUser {
  id: number
  firstName: string
  lastName: string
  email: string
  mobile: string | null
  city: string | null
  jobTitle: string | null
  language: string
  isActive: boolean
  createdAt: string
  updatedAt: string | null
  roleIds: number[]
  organizationId: number | null
  organizationName: string | null
}

export interface CreateUserInput {
  firstName: string
  lastName: string
  email: string
  password: string
  mobile?: string
  city?: string
  jobTitle?: string
  language?: string
  isActive: boolean
}

export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  newThisMonth: number
  // Present only on the platform-wide view (global user, no active org).
  totalOrganizations: number | null
  activeOrganizations: number | null
  inactiveOrganizations: number | null
}

export type UserSortField =
  | "name"
  | "email"
  | "city"
  | "jobTitle"
  | "status"
  | "mobile"
  | "joined"
  | "updated"

export interface UsersQuery {
  search?: string
  sortBy?: UserSortField
  sortDir?: "asc" | "desc"
  page?: number
  pageSize?: number
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

// --- Human Resources module ---

// The set of employment status/type values, kept in sync with the server enums.
export const EMPLOYMENT_STATUSES = [
  "Active",
  "Probation",
  "OnLeave",
  "Suspended",
  "Terminated",
] as const
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number]

export const EMPLOYMENT_TYPES = [
  "FullTime",
  "PartTime",
  "Contract",
  "Intern",
  "Temporary",
] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]

export interface DepartmentRow {
  id: number
  name: string
  code: string
  description: string | null
  parentDepartmentId: number | null
  parentDepartmentName: string | null
  managerEmployeeId: number | null
  managerName: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface DepartmentLookup {
  id: number
  name: string
  code: string
}

export interface JobTitleRow {
  id: number
  name: string
  code: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

export interface JobTitleLookup {
  id: number
  name: string
  code: string
}

export interface EmployeeRow {
  id: number
  employeeNumber: string
  userId: number
  fullName: string
  email: string
  departmentId: number | null
  departmentName: string | null
  jobTitleId: number | null
  jobTitleName: string | null
  reportingManagerId: number | null
  reportingManagerName: string | null
  joiningDate: string
  employmentStatus: EmploymentStatus
  employmentType: EmploymentType
  workEmail: string | null
  workPhone: string | null
  createdAt: string
  updatedAt: string | null
}

export interface EmployeeDetail extends EmployeeRow {
  notes: string | null
}

export interface EmployeeLookup {
  id: number
  employeeNumber: string
  fullName: string
}

export interface AssignableUser {
  id: number
  fullName: string
  email: string
}

// Filters accepted by the employees datatable (merged into the request params).
export interface EmployeeFilters {
  departmentId?: number
  jobTitleId?: number
  employmentStatus?: EmploymentStatus
  reportingManagerId?: number
  joiningDateFrom?: string
  joiningDateTo?: string
}

// --- Attendance module ---

export const ATTENDANCE_STATUSES = [
  "Present",
  "Absent",
  "Late",
  "HalfDay",
  "Leave",
  "Holiday",
  "Weekend",
  "WorkFromHome",
  "OnDuty",
] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const CORRECTION_STATUSES = ["Pending", "Approved", "Rejected"] as const
export type CorrectionStatus = (typeof CORRECTION_STATUSES)[number]

export interface AttendanceRow {
  id: number
  employeeId: number
  employeeNumber: string
  employeeName: string
  departmentName: string | null
  date: string
  checkInAt: string | null
  checkOutAt: string | null
  workedMinutes: number
  breakMinutes: number
  overtimeMinutes: number
  status: AttendanceStatus
  remarks: string | null
}

export interface AttendanceEventItem {
  id: number
  type: "CheckIn" | "CheckOut" | "BreakStart" | "BreakEnd"
  occurredAt: string
  source: string
  notes: string | null
}

export interface AttendanceDetail extends AttendanceRow {
  events: AttendanceEventItem[]
}

export interface MyAttendanceToday {
  recordId: number | null
  date: string
  checkInAt: string | null
  checkOutAt: string | null
  workedMinutes: number
  breakMinutes: number
  status: AttendanceStatus
  isCheckedIn: boolean
  isOnBreak: boolean
  hasCheckedOut: boolean
  isLinked: boolean
  currentBreakStartedAt: string | null
}

export interface AttendanceFilters {
  employeeId?: number
  departmentId?: number
  status?: AttendanceStatus
  dateFrom?: string
  dateTo?: string
}

export interface SaveAttendanceInput {
  employeeId: number
  date: string
  checkInAt?: string | null
  checkOutAt?: string | null
  breakMinutes: number
  status: AttendanceStatus
  remarks?: string | null
}

export interface CorrectionRow {
  id: number
  employeeId: number
  employeeNumber: string
  employeeName: string
  date: string
  requestedCheckInAt: string | null
  requestedCheckOutAt: string | null
  requestedStatus: AttendanceStatus | null
  reason: string
  status: CorrectionStatus
  reviewNotes: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface SaveCorrectionInput {
  date: string
  requestedCheckInAt?: string | null
  requestedCheckOutAt?: string | null
  requestedStatus?: AttendanceStatus | null
  reason: string
  employeeId?: number
}

export interface AttendanceDashboardStats {
  date: string
  totalEmployees: number
  presentToday: number
  absentToday: number
  lateToday: number
  onLeaveToday: number
  workFromHomeToday: number
  missingCheckOut: number
  pendingCorrections: number
}

export interface AttendanceTrendPoint {
  date: string
  present: number
  absent: number
  late: number
}

// Per-request options understood by our interceptor.
type RequestConfig = InternalAxiosRequestConfig & {
  // Skip the global redirect-to-login behaviour for an expected 401
  // (e.g. the initial "who am I?" probe for guests).
  skipAuthRedirect?: boolean
  // Suppress the error toast for this request.
  skipErrorToast?: boolean
}

// The auth layer registers a callback so the interceptor can redirect on 401
// without importing the router here.
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

export const http = axios.create({
  baseURL: "/",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
})

// Shape of an error response body from the API. Plain errors carry a
// `message`; validation failures carry a per-field `errors` dictionary
// (ASP.NET ValidationProblemDetails).
interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
}

function messageFor(error: AxiosError<ApiErrorBody>): string {
  const status = error.response?.status
  const fromServer = error.response?.data?.message
  if (fromServer) return fromServer
  if (error.code === "ERR_NETWORK") return i18n.t("errors.network")
  switch (status) {
    case 400:
      return i18n.t("errors.badRequest")
    case 401:
      return i18n.t("errors.unauthorized")
    case 403:
      return i18n.t("errors.forbidden")
    case 404:
      return i18n.t("errors.notFound")
    case 409:
      return i18n.t("errors.conflict")
    case 422:
      return i18n.t("errors.unprocessable")
    default:
      return status && status >= 500
        ? i18n.t("errors.server")
        : i18n.t("errors.generic")
  }
}

// Normalise camelCase keys so they line up with form field names.
function normaliseFieldErrors(
  errors?: Record<string, string[]>,
): Record<string, string[]> | undefined {
  if (!errors) return undefined
  const out: Record<string, string[]> = {}
  for (const [key, messages] of Object.entries(errors)) {
    if (!key) continue
    const field = key.charAt(0).toLowerCase() + key.slice(1)
    out[field] = messages
  }
  return out
}

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as RequestConfig | undefined
    const status = error.response?.status ?? 0
    const message = messageFor(error)
    const fieldErrors = normaliseFieldErrors(error.response?.data?.errors)

    if (status === 401 && !config?.skipAuthRedirect) {
      // Genuine "session expired" 401 -> let the app redirect to login.
      onUnauthorized?.()
    } else if (!config?.skipErrorToast && !fieldErrors) {
      // Field validation errors are shown inline by the form, so only toast
      // for everything else (including login failures).
      toast.error(message)
    }

    return Promise.reject(new ApiError(status, message, fieldErrors))
  }
)

// ApiErrors are already surfaced to the user (toast / redirect); prevent
// "unhandled rejection" noise when a caller intentionally doesn't catch.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    if (event.reason instanceof ApiError) event.preventDefault()
  })
}

export const api = {
  // --- Auth ---
  // A failed login returns 401; skip the global redirect so the user stays on
  // the form and just sees the error toast.
  login: (email: string, password: string) =>
    http
      .post<User>("/api/auth/login", { email, password }, {
        skipAuthRedirect: true,
      } as RequestConfig)
      .then((r) => r.data),

  logout: () => http.post<void>("/api/auth/logout").then(() => undefined),

  // Guests legitimately get a 401 here on first load, so don't redirect/toast.
  me: () =>
    http
      .get<User>("/api/auth/me", {
        skipAuthRedirect: true,
        skipErrorToast: true,
      } as RequestConfig)
      .then((r) => r.data),

  // --- Profile ---
  getProfile: () =>
    http.get<Profile>("/api/auth/profile").then((r) => r.data),

  updateProfile: (data: UpdateProfileInput) =>
    http.put<Profile>("/api/auth/profile", data).then((r) => r.data),

  setLanguage: (language: string) =>
    http.put<void>("/api/auth/language", { language }).then(() => undefined),

  // --- Impersonation (super admin) ---
  impersonate: (userId: number) =>
    http.post<User>(`/api/auth/impersonate/${userId}`).then((r) => r.data),

  stopImpersonating: () =>
    http.post<User>("/api/auth/impersonate/stop").then((r) => r.data),

  // --- Platform (global users): organization selector ---
  listOrganizations: (search?: string) =>
    http
      .get<Organization[]>("/api/platform/organizations", {
        params: search ? { search } : {},
      })
      .then((r) => r.data),

  switchOrganization: (organizationId: number) =>
    http
      .post<User>(`/api/platform/switch-org/${organizationId}`)
      .then((r) => r.data),

  stopSwitchOrganization: () =>
    http.post<User>("/api/platform/switch-org/stop").then((r) => r.data),

  // --- Organizations management (platform.manage_organizations) ---
  createOrganization: (data: CreateOrganizationInput) =>
    http.post<OrganizationRow>("/api/organizations", data).then((r) => r.data),

  updateOrganization: (id: number, data: UpdateOrganizationInput) =>
    http.put<void>(`/api/organizations/${id}`, data).then(() => undefined),

  // --- Roles & permissions ---
  createRole: (name: string) =>
    http.post("/api/roles", { name }).then((r) => r.data),
  deleteRole: (id: number) => http.delete(`/api/roles/${id}`).then(() => undefined),
  setRolePermissions: (id: number, permissionIds: number[]) =>
    http.put(`/api/roles/${id}/permissions`, { permissionIds }).then(() => undefined),
  setUserRoles: (userId: number, roleIds: number[]) =>
    http.put(`/api/users/${userId}/roles`, { roleIds }).then(() => undefined),

  // --- Human Resources: typeahead lookups ---
  lookupDepartments: (search?: string, excludeId?: number) =>
    http
      .get<DepartmentLookup[]>("/api/departments/lookup", {
        params: { search: search || undefined, excludeId },
      })
      .then((r) => r.data),

  lookupJobTitles: (search?: string) =>
    http
      .get<JobTitleLookup[]>("/api/jobtitles/lookup", {
        params: { search: search || undefined },
      })
      .then((r) => r.data),

  lookupEmployees: (search?: string, excludeId?: number) =>
    http
      .get<EmployeeLookup[]>("/api/employees/lookup", {
        params: { search: search || undefined, excludeId },
      })
      .then((r) => r.data),

  lookupAssignableUsers: (search?: string, includeUserId?: number) =>
    http
      .get<AssignableUser[]>("/api/employees/assignable-users", {
        params: { search: search || undefined, includeUserId },
      })
      .then((r) => r.data),

  // --- Attendance self-service & workflow ---
  myAttendanceToday: () =>
    http.get<MyAttendanceToday>("/api/attendance/me").then((r) => r.data),

  attendanceCheckIn: () =>
    http.post<AttendanceDetail>("/api/attendance/check-in").then((r) => r.data),
  attendanceCheckOut: () =>
    http.post<AttendanceDetail>("/api/attendance/check-out").then((r) => r.data),
  attendanceBreakStart: () =>
    http.post<AttendanceDetail>("/api/attendance/break-start").then((r) => r.data),
  attendanceBreakEnd: () =>
    http.post<AttendanceDetail>("/api/attendance/break-end").then((r) => r.data),

  attendanceDashboard: (date?: string) =>
    http
      .get<AttendanceDashboardStats>("/api/attendance/dashboard", {
        params: date ? { date } : {},
      })
      .then((r) => r.data),

  attendanceTrend: (from?: string, to?: string) =>
    http
      .get<AttendanceTrendPoint[]>("/api/attendance/trend", {
        params: { from, to },
      })
      .then((r) => r.data),

  reviewCorrection: (id: number, approve: boolean, reviewNotes?: string) =>
    http
      .post<void>(`/api/attendance-corrections/${id}/${approve ? "approve" : "reject"}`, {
        reviewNotes,
      })
      .then(() => undefined),

  // Triggers a CSV download honouring the current attendance filters.
  exportAttendance: (filters: AttendanceFilters) =>
    http
      .get("/api/attendance/export", { params: filters, responseType: "blob" })
      .then((r) => r.data as Blob),
}
