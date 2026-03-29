"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { AtRiskTable } from "@/components/dashboard/at-risk-table";
import { EmptyState } from "@/components/empty-state";
import { usePagination } from "@/hooks/use-pagination";
import type { DashboardStats } from "@/types/dashboard";
import type { AtRiskResponse } from "@/types/score";
import DashboardLoading from "./loading";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [atRisk, setAtRisk] = useState<AtRiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { page, pageSize, nextPage, prevPage } = usePagination();

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashboardData, atRiskData] = await Promise.all([
          api.get<DashboardStats>("/dashboard/stats"),
          api.get<AtRiskResponse>(
            `/at-risk?page=${page}&page_size=${pageSize}`,
          ),
        ]);
        setStats(dashboardData);
        setAtRisk(atRiskData);
      } catch {
        // API not available — show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [page, pageSize]);

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
