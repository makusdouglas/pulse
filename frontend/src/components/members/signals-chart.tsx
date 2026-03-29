import type { SignalsResponse } from "@/types/member";

interface SignalsChartProps {
  signals: SignalsResponse;
}

const signalLabels: Record<keyof SignalsResponse, string> = {
  dias_sem_treino: "Dias sem treino",
  queda_frequencia: "Queda de frequencia",
  inadimplencia: "Inadimplencia",
  queda_duracao: "Queda de duracao",
  baixa_frequencia: "Baixa frequencia",
  historico_pagamento: "Historico pagamento",
  aluno_novo: "Aluno novo",
};

export function SignalsChart({ signals }: SignalsChartProps) {
  const entries = Object.entries(signals) as [keyof SignalsResponse, number][];
  const maxValue = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{signalLabels[key]}</span>
            <span className="font-mono font-medium">{value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all"
              style={{ width: `${(value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
