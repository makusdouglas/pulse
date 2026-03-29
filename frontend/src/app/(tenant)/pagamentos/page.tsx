"use client";

import { CreditCard } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function PagamentosPage() {
  // TODO: fetch from GET /payments when endpoint exists

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pagamentos</h1>
        <p className="text-muted-foreground">
          Acompanhe os pagamentos dos alunos
        </p>
      </div>

      <EmptyState
        icon={CreditCard}
        title="Nenhum pagamento encontrado"
        description="Importe dados de pagamento via CSV em Configuracoes > Importacao."
      />
    </div>
  );
}
