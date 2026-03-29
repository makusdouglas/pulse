"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { api } from "@/lib/api-client";

export function useApi<T>(
  path: string | null,
  options?: SWRConfiguration<T>,
) {
  return useSWR<T>(
    path,
    (url: string) => api.get<T>(url),
    {
      revalidateOnFocus: false,
      ...options,
    },
  );
}
