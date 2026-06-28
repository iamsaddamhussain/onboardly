import { http } from "@/lib/api"

// Helper functions for working with RESTful resources.
//
// `endpoint` is the resource path relative to /api (e.g. "users" ->
// /api/users, "dashboard/stats" -> /api/dashboard/stats). Every call goes
// through the shared axios instance, so the response interceptor (cookie
// auth, global error toasts, 401 -> redirect) applies automatically.

export function apiUrl(endpoint: string, id: string | number | null = null) {
  const base = `/api/${endpoint}`.replace(/\/+$/, "")
  return id == null ? base : `${base}/${id}`
}

export function get<T>(
  endpoint: string,
  id: string | number | null = null,
  params: Record<string, unknown> = {},
) {
  return http.get<T>(apiUrl(endpoint, id), { params }).then(({ data }) => data)
}

export function post<T>(endpoint: string, data: unknown) {
  return http.post<T>(apiUrl(endpoint), data).then(({ data }) => data)
}

// Insert or update based on whether an id is provided.
export function save<T>(
  endpoint: string,
  id: string | number | null,
  data: unknown,
) {
  if (!id) {
    return post<T>(endpoint, data)
  }
  return http.put<T>(apiUrl(endpoint, id), data).then(({ data }) => data)
}

// Destroy a resource.
export function destroy<T = void>(endpoint: string, id: string | number) {
  return http.delete<T>(apiUrl(endpoint, id)).then(({ data }) => data)
}
