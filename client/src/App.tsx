import { Navigate, Route, Routes } from "react-router-dom"

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

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/organization"
          element={
            <PermissionRoute permission={["manage_users", "manage_roles", "platform.manage_organizations"]}>
              <OrganizationPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/users"
          element={
            <PermissionRoute permission="manage_users">
              <UsersPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/users/new"
          element={
            <PermissionRoute permission="manage_users">
              <NewUserPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/users/:id/edit"
          element={
            <PermissionRoute permission="manage_users">
              <NewUserPage />
            </PermissionRoute>
          }
        />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/roles"
          element={
            <PermissionRoute permission="manage_roles">
              <RolesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/organizations"
          element={
            <PermissionRoute permission="platform.manage_organizations">
              <OrganizationsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <PermissionRoute permission={["view_audit", "platform.view_all_audits"]}>
              <AuditLogPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <PermissionRoute permission="employees.view">
              <EmployeesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/employees/new"
          element={
            <PermissionRoute permission="employees.create">
              <EmployeeFormPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/employees/:id"
          element={
            <PermissionRoute permission="employees.view">
              <EmployeeProfilePage />
            </PermissionRoute>
          }
        />
        <Route
          path="/employees/:id/edit"
          element={
            <PermissionRoute permission="employees.edit">
              <EmployeeFormPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/departments"
          element={
            <PermissionRoute permission="departments.view">
              <DepartmentsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/departments/new"
          element={
            <PermissionRoute permission="departments.create">
              <DepartmentFormPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/departments/:id/edit"
          element={
            <PermissionRoute permission="departments.edit">
              <DepartmentFormPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/job-titles"
          element={
            <PermissionRoute permission="jobtitles.view">
              <JobTitlesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/job-titles/new"
          element={
            <PermissionRoute permission="jobtitles.create">
              <JobTitleFormPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/job-titles/:id/edit"
          element={
            <PermissionRoute permission="jobtitles.edit">
              <JobTitleFormPage />
            </PermissionRoute>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
