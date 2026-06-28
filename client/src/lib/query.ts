import {
  keepPreviousData,
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query"

import { get } from "@/lib/resource"

// Errors are already surfaced by the axios interceptor (toast / 401 redirect),
// so disable retries and window-focus refetching to avoid duplicate toasts.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

// Generic GET-collection / GET-resource hook. The query key is
// [endpoint, params], so different params are cached separately and any
// mutation invalidating [endpoint] refreshes them all.
export function useResource<T>(
  endpoint: string,
  params: Record<string, unknown> = {},
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
) {
  return useQuery<T>({
    queryKey: [endpoint, params],
    queryFn: () => get<T>(endpoint, null, params),
    placeholderData: keepPreviousData,
    ...options,
  })
}

// Generic mutation hook. Pass the call (using post/save/destroy) and the list
// of resource endpoints whose caches should be invalidated on success.
export function useResourceMutation<TData, TVars>(
  mutationFn: (vars: TVars) => Promise<TData>,
  invalidate: string[] = [],
  options?: Omit<UseMutationOptions<TData, unknown, TVars>, "mutationFn">,
) {
  const queryClient = useQueryClient()
  return useMutation<TData, unknown, TVars>({
    mutationFn,
    ...options,
    onSuccess: (data, vars, ctx) => {
      invalidate.forEach((endpoint) =>
        queryClient.invalidateQueries({ queryKey: [endpoint] }),
      )
      options?.onSuccess?.(data, vars, ctx)
    },
  })
}
