"use client";

import { useRouter } from "next/navigation";
import { Phone, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/data-table";
import { TierBadge } from "@/components/tier-badge";
import type { ScoreResponse } from "@/types/dashboard";

interface AtRiskTableProps {
  scores: ScoreResponse[];
  total: number;
  page: number;
  pageSize: number;
  onNextPage: () => void;
  onPrevPage: () => void;
}

const columns: Column<ScoreResponse>[] = [
  {
    key: "name",
    header: "Aluno",
    render: (row) => <span className="font-medium">{row.member_name}</span>,
  },
  {
    key: "score",
    header: "Score",
    render: (row) => <span className="font-mono">{row.score}</span>,
  },
  {
    key: "tier",
    header: "Tier",
    render: (row) => <TierBadge tier={row.tier} />,
  },
  {
    key: "reasons",
    header: "Motivo",
    render: (row) => (
      <span className="text-sm text-muted-foreground">
        {row.reasons.slice(0, 2).join(", ")}
      </span>
    ),
    className: "hidden lg:table-cell",
  },
  {
    key: "action",
    header: "Acao",
    render: () => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm">
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <MessageCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Mail className="h-4 w-4" />
        </Button>
      </div>
    ),
    className: "hidden lg:table-cell",
  },
];

export function AtRiskTable({
  scores,
  total,
  page,
  pageSize,
  onNextPage,
  onPrevPage,
}: AtRiskTableProps) {
  const router = useRouter();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Alunos em Risco</h2>
        <span className="text-sm text-muted-foreground">
          {total} alunos
        </span>
      </div>
      <DataTable
        columns={columns}
        data={scores}
        total={total}
        page={page}
        pageSize={pageSize}
        onNextPage={onNextPage}
        onPrevPage={onPrevPage}
        onRowClick={(row) => router.push(`/alunos/${row.member_id}`)}
      />
    </div>
  );
}
