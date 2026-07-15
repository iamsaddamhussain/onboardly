import { Navigate, type RouteObject } from "react-router-dom"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { PermissionRoute } from "@/components/PermissionRoute"
import { GuestRoute } from "@/components/GuestRoute"
import { AppLayout } from "@/components/AppLayout"
import LoginPage from "@/pages/Login"
import DashboardPage from "@/pages/Dashboard"
import UsersPage from "@/pages/Users"
import NewUserPage from "@/pages/NewUser"
import RolesPage from "@/pages/Roles"
import OrganizationsPage from "@/pages/Organizations"
import OrganizationPage from "@/pages/Organization"
import OrganizationEditPage from "@/pages/OrganizationEdit"
import AuditLogPage from "@/pages/AuditLog"
import ProfilePage from "@/pages/Profile"
import SettingsPage from "@/pages/Settings"
import EmployeesPage from "@/pages/hr/Employees"
import EmployeeFormPage from "@/pages/hr/EmployeeForm"
import EmployeeProfilePage from "@/pages/hr/EmployeeProfile"
import DepartmentsPage from "@/pages/hr/Departments"
import DepartmentFormPage from "@/pages/hr/DepartmentForm"
import JobTitlesPage from "@/pages/hr/JobTitles"
import JobTitleFormPage from "@/pages/hr/JobTitleForm"
import AttendancePage from "@/pages/hr/Attendance"
import AttendanceFormPage from "@/pages/hr/AttendanceForm"
import AttendanceDashboardPage from "@/pages/hr/AttendanceDashboard"
import MyAttendancePage from "@/pages/hr/MyAttendance"
import CorrectionsPage from "@/pages/hr/Corrections"
import OrgChartPage from "@/pages/hr/OrgChart"
import LeaveTypesPage from "@/pages/hr/LeaveTypes"
import LeaveTypeFormPage from "@/pages/hr/LeaveTypeForm"
import LeavePoliciesPage from "@/pages/hr/LeavePolicies"
import LeavePolicyFormPage from "@/pages/hr/LeavePolicyForm"
import ApplyLeavePage from "@/pages/hr/ApplyLeave"
import MyLeavePage from "@/pages/hr/MyLeave"
import LeaveRequestsPage from "@/pages/hr/LeaveRequests"
import LeaveBalancesPage from "@/pages/hr/LeaveBalances"
import HolidaysPage from "@/pages/hr/Holidays"
import HolidayFormPage from "@/pages/hr/HolidayForm"

export const routes: RouteObject[] = [
  {
    path: "/login",
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/dashboard", element: <DashboardPage /> },
      {
        path: "/organization",
        element: (
          <PermissionRoute permission={["manage_users", "manage_roles", "platform.manage_organizations"]}>
            <OrganizationPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/organization/edit",
        element: (
          <PermissionRoute permission="manage_users">
            <OrganizationEditPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/users",
        element: (
          <PermissionRoute permission="manage_users">
            <UsersPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/users/new",
        element: (
          <PermissionRoute permission="manage_users">
            <NewUserPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/users/:id/edit",
        element: (
          <PermissionRoute permission="manage_users">
            <NewUserPage />
          </PermissionRoute>
        ),
      },
      { path: "/profile", element: <ProfilePage /> },
      {
        path: "/roles",
        element: (
          <PermissionRoute permission="manage_roles">
            <RolesPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/organizations",
        element: (
          <PermissionRoute permission="platform.manage_organizations">
            <OrganizationsPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/audit",
        element: (
          <PermissionRoute permission={["view_audit", "platform.view_all_audits"]}>
            <AuditLogPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/employees",
        element: (
          <PermissionRoute permission="employees.view">
            <EmployeesPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/employees/new",
        element: (
          <PermissionRoute permission="employees.create">
            <EmployeeFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/employees/:id",
        element: (
          <PermissionRoute permission={["employees.view", "orgchart.view"]}>
            <EmployeeProfilePage />
          </PermissionRoute>
        ),
      },
      {
        path: "/employees/:id/edit",
        element: (
          <PermissionRoute permission="employees.edit">
            <EmployeeFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/departments",
        element: (
          <PermissionRoute permission="departments.view">
            <DepartmentsPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/departments/new",
        element: (
          <PermissionRoute permission="departments.create">
            <DepartmentFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/departments/:id/edit",
        element: (
          <PermissionRoute permission="departments.edit">
            <DepartmentFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/job-titles",
        element: (
          <PermissionRoute permission="jobtitles.view">
            <JobTitlesPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/job-titles/new",
        element: (
          <PermissionRoute permission="jobtitles.create">
            <JobTitleFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/job-titles/:id/edit",
        element: (
          <PermissionRoute permission="jobtitles.edit">
            <JobTitleFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/attendance",
        element: (
          <PermissionRoute permission="attendance.view">
            <AttendancePage />
          </PermissionRoute>
        ),
      },
      {
        path: "/attendance/new",
        element: (
          <PermissionRoute permission="attendance.create">
            <AttendanceFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/attendance/:id/edit",
        element: (
          <PermissionRoute permission="attendance.edit">
            <AttendanceFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/attendance-dashboard",
        element: (
          <PermissionRoute permission="attendance.view">
            <AttendanceDashboardPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/attendance-corrections",
        element: (
          <PermissionRoute permission={["attendance.approve", "attendance.view"]}>
            <CorrectionsPage />
          </PermissionRoute>
        ),
      },
      { path: "/my-attendance", element: <MyAttendancePage /> },
      {
        path: "/org-chart",
        element: (
          <PermissionRoute permission="orgchart.view">
            <OrgChartPage />
          </PermissionRoute>
        ),
      },
      { path: "/settings", element: <SettingsPage /> },
      {
        path: "/leave-types",
        element: (
          <PermissionRoute permission={["leave.manage_types", "leave.view"]}>
            <LeaveTypesPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/leave-types/new",
        element: (
          <PermissionRoute permission="leave.manage_types">
            <LeaveTypeFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/leave-types/:id/edit",
        element: (
          <PermissionRoute permission="leave.manage_types">
            <LeaveTypeFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/leave-policies",
        element: (
          <PermissionRoute permission={["leave.manage_policies", "leave.view"]}>
            <LeavePoliciesPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/leave-policies/new",
        element: (
          <PermissionRoute permission="leave.manage_policies">
            <LeavePolicyFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/leave-policies/:id/edit",
        element: (
          <PermissionRoute permission="leave.manage_policies">
            <LeavePolicyFormPage />
          </PermissionRoute>
        ),
      },
      { path: "/my-leave", element: <MyLeavePage /> },
      { path: "/leave/apply", element: <ApplyLeavePage /> },
      {
        path: "/leave-requests",
        element: (
          <PermissionRoute permission={["leave.approve", "leave.view"]}>
            <LeaveRequestsPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/leave-balances",
        element: (
          <PermissionRoute permission="leave.manage_balances">
            <LeaveBalancesPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/holidays",
        element: (
          <PermissionRoute permission={["holidays.manage", "holidays.view", "leave.view"]}>
            <HolidaysPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/holidays/new",
        element: (
          <PermissionRoute permission="holidays.manage">
            <HolidayFormPage />
          </PermissionRoute>
        ),
      },
      {
        path: "/holidays/:id/edit",
        element: (
          <PermissionRoute permission="holidays.manage">
            <HolidayFormPage />
          </PermissionRoute>
        ),
      },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]
