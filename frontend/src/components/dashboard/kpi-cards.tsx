"use client";

import { Users, UserCheck, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStats } from "@/types/dashboard";

interface KpiCardsProps {
  stats: DashboardStats;
}

export function KpiCards({ stats }: KpiCardsProps) {
  const cards = [
    {
      label: "Total Alunos Ativos",
      value: stats.active_members,
      icon: Users,
      change: null,
    },
    {
      label: "Em Risco",
      value: stats.at_risk_count,
      icon: AlertTriangle,
      change: null,
      highlight: true,
    },
    {
      label: "Criticos",
      value: stats.tier_counts.critical,
      icon: UserCheck,
      change: null,
      highlight: true,
    },
    {
      label: "Taxa de Churn",
      value: `${stats.avg_score.toFixed(1)}%`,
      icon: TrendingUp,
      change: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {card.label}
              </p>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-2xl font-bold lg:text-3xl">{card.value}</p>
              {card.highlight && stats.at_risk_count > 0 && (
                <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                  +{Math.round(
                    (stats.at_risk_count / stats.total_members) * 100,
                  )}
                  %
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
