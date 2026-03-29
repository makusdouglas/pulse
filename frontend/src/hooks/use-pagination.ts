"use client";

import { useCallback, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

export function usePagination(initialPageSize: number = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);

  const nextPage = useCallback(() => setPage((p) => p + 1), []);
  const prevPage = useCallback(
    () => setPage((p) => Math.max(1, p - 1)),
    [],
  );
  const goToPage = useCallback((p: number) => setPage(Math.max(1, p)), []);
  const resetPage = useCallback(() => setPage(1), []);

  return { page, pageSize, nextPage, prevPage, goToPage, resetPage };
}
