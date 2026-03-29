"use client";

import { ShieldCheck } from "lucide-react";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { AtRiskTable } from "@/components/dashboard/at-risk-table";
import { EmptyState } from "@/components/empty-state";
import { useApi } from "@/hooks/use-api";
import { usePagination } from "@/hooks/use-pagination";
import type { DashboardStats } from "@/types/dashboard";
import type { AtRiskResponse } from "@/types/score";
import DashboardLoading from "./loading";

export default function DashboardPage() {
  const { page, pageSize, nextPage, prevPage } = usePagination();

  const { data: stats, isLoading: loadingStats } =
    useApi<DashboardStats>("/dashboard/stats");
  const { data: atRisk, isLoading: loadingAtRisk } =
    useApi<AtRiskResponse>(`/at-risk?page=${page}&page_size=${pageSize}`);

  const loading = loadingStats || loadingAtRisk;

  if (loading) return <DashboardLoading />;

  if (!stats || stats.total_members === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visao geral da retencao de alunos
          </p>
        </div>
        <EmptyState
          icon={ShieldCheck}
          title="Nenhum aluno em risco"
          description="Todos os alunos estao com frequencia e pagamentos em dia."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visao geral da retencao de alunos
        </p>
      </div>

      <KpiCards stats={stats} />

      {atRisk && (
        <AtRiskTable
          scores={atRisk.members}
          total={atRisk.total}
          page={page}
          pageSize={pageSize}
          onNextPage={nextPage}
          onPrevPage={prevPage}
        />
      )}
    </div>
  );
}
