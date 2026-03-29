"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Phone, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TierBadge } from "@/components/tier-badge";
import { ScoreGauge } from "@/components/members/score-gauge";
import { SignalsChart } from "@/components/members/signals-chart";
import { useApi } from "@/hooks/use-api";
import { STATUS_LABELS } from "@/lib/constants";
import type { MemberScoreResponse } from "@/types/member";

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data, isLoading: loading } = useApi<MemberScoreResponse>(
    `/members/${params.id}/score`,
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-64 animate-pulse rounded bg-muted" />
          <div className="h-64 animate-pulse rounded bg-muted lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <p className="text-muted-foreground">Aluno nao encontrado.</p>
      </div>
    );
  }

  const { member, score, tier, reasons, signals, computed_at } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{member.name}</h1>
            <TierBadge tier={tier} />
          </div>
          <p className="text-sm text-muted-foreground">
            {STATUS_LABELS[member.status]} | {member.email ?? "Sem email"} |{" "}
            {member.phone ?? "Sem telefone"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Score Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score de Risco</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <ScoreGauge score={score} tier={tier} />
            <p className="text-xs text-muted-foreground">
              Calculado em{" "}
              {new Date(computed_at).toLocaleDateString("pt-BR")}
            </p>
            <Separator />
            <div className="flex w-full gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Phone className="mr-1 h-3 w-3" /> Ligar
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <MessageCircle className="mr-1 h-3 w-3" /> WhatsApp
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Mail className="mr-1 h-3 w-3" /> Email
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Signals + Reasons */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Sinais de Churn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <SignalsChart signals={signals} />
            <Separator />
            <div>
              <h3 className="mb-2 text-sm font-semibold">Motivos</h3>
              <ul className="space-y-1">
                {reasons.map((reason, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-foreground" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
