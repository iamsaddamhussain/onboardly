import { create } from "zustand"

import { api, type User } from "@/lib/api"

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
  // Called by the api client's 401 handler to clear the session locally.
  sessionExpired: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,
  fetchCurrentUser: async () => {
    try {
      set({ user: await api.me() })
    } catch {
      set({ user: null })
    } finally {
      set({ initialized: true })
    }
  },
  login: async (email, password) => {
    const user = await api.login(email, password)
    set({ user })
    return user
  },
  logout: async () => {
    await api.logout()
    set({ user: null })
  },
  sessionExpired: () => set({ user: null }),
}))
