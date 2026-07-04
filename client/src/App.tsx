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
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
