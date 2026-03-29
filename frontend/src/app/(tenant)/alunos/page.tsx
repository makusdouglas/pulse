"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { useDebounce } from "@/hooks/use-debounce";
import { usePagination } from "@/hooks/use-pagination";
import { api } from "@/lib/api-client";
import { STATUS_LABELS } from "@/lib/constants";
import type { MemberResponse, MemberListResponse } from "@/types/member";

const columns: Column<MemberResponse>[] = [
  {
    key: "name",
    header: "Nome",
    render: (row) => <span className="font-medium">{row.name}</span>,
  },
  {
    key: "email",
    header: "Email",
    render: (row) => (
      <span className="text-muted-foreground">{row.email ?? "—"}</span>
    ),
    className: "hidden lg:table-cell",
  },
  {
    key: "phone",
    header: "Telefone",
    render: (row) => (
      <span className="text-muted-foreground">{row.phone ?? "—"}</span>
    ),
    className: "hidden lg:table-cell",
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Badge
        variant={
          row.status === "active"
            ? "secondary"
            : row.status === "cancelled"
              ? "destructive"
              : "outline"
        }
      >
        {STATUS_LABELS[row.status]}
      </Badge>
    ),
  },
  {
    key: "enrolled_at",
    header: "Cadastro",
    render: (row) => (
      <span className="text-sm text-muted-foreground">
        {row.enrolled_at
          ? new Date(row.enrolled_at).toLocaleDateString("pt-BR")
          : "—"}
      </span>
    ),
    className: "hidden lg:table-cell",
  },
];

export default function AlunosPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const debouncedSearch = useDebounce(search);
  const { page, pageSize, nextPage, prevPage, resetPage } = usePagination();
  const [data, setData] = useState<MemberListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    resetPage();
  }, [debouncedSearch, status, resetPage]);

  useEffect(() => {
    async function fetchMembers() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          page_size: pageSize.toString(),
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (status !== "all") params.set("status", status);

        const result = await api.get<MemberListResponse>(
          `/members?${params.toString()}`,
        );
        setData(result);
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
  }, [page, pageSize, debouncedSearch, status]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alunos</h1>
        <p className="text-muted-foreground">
          Gerencie todos os alunos da academia
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar alunos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.members ?? []}
          total={data?.total}
          page={data?.page}
          pageSize={data?.page_size}
          onNextPage={nextPage}
          onPrevPage={prevPage}
          onRowClick={(row) => router.push(`/alunos/${row.id}`)}
          emptyState={
            <EmptyState
              icon={Users}
              title="Nenhum aluno encontrado"
              description="Importe alunos via CSV em Configuracoes > Importacao."
            />
          }
        />
      )}
    </div>
  );
}
