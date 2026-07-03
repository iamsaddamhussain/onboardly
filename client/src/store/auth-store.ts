import { create } from "zustand"

import { api, type User } from "@/lib/api"
import { setLanguage as applyLanguage, type Language } from "@/lib/i18n"

interface AuthState {
  user: User | null
  // Becomes true once the initial "who am I?" probe has resolved, so guards
  // can wait instead of flashing the login page on first load.
  initialized: boolean
  // Restore the session on app start. A guest legitimately gets a 401 here,
  // which the api client keeps silent; we just end up with user = null.
  fetchCurrentUser: () => Promise<void>
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  // Persist the signed-in user's UI language to the server and apply it locally.
  setLanguage: (language: Language) => Promise<void>
  // Start impersonating another user (super admin only).
  impersonate: (userId: number) => Promise<User>
  // Switch back from an impersonated session to the original admin account.
  stopImpersonating: () => Promise<void>
  // Called by the api client's 401 handler to clear the session locally.
  sessionExpired: () => void
  // Permission/role helpers — drive UI visibility off the user's permissions.
  hasPermission: (permission: string) => boolean
  hasRole: (role: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  initialized: false,
  fetchCurrentUser: async () => {
    try {
      const user = await api.me()
      applyLanguage(user.language as Language)
      set({ user })
    } catch {
      set({ user: null })
    } finally {
      set({ initialized: true })
    }
  },
  login: async (email, password) => {
    const user = await api.login(email, password)
    applyLanguage(user.language as Language)
    set({ user })
    return user
  },
  logout: async () => {
    await api.logout()
    set({ user: null })
  },
  setLanguage: async (language) => {
    await api.setLanguage(language)
    applyLanguage(language)
    const user = get().user
    if (user) set({ user: { ...user, language } })
  },
  impersonate: async (userId) => {
    const user = await api.impersonate(userId)
    applyLanguage(user.language as Language)
    set({ user })
    return user
  },
  stopImpersonating: async () => {
    const user = await api.stopImpersonating()
    applyLanguage(user.language as Language)
    set({ user })
  },
  sessionExpired: () => set({ user: null }),
  hasPermission: (permission) =>
    get().user?.permissions.includes(permission) ?? false,
  hasRole: (role) => get().user?.roles.includes(role) ?? false,
}))
