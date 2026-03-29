"use client";

import { useAuth } from "@clerk/nextjs";
import useSWR, { type SWRConfiguration } from "swr";
import { api } from "@/lib/api-client";

export function useApi<T>(
  path: string | null,
  options?: SWRConfiguration<T>,
) {
  const { getToken } = useAuth();

  return useSWR<T>(
    path,
    async (url: string) => {
      const token = await getToken();
      return api.get<T>(url, token ?? undefined);
    },
    {
      revalidateOnFocus: false,
      ...options,
    },
  );
}
