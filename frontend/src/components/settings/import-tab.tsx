"use client";

import { CsvUpload } from "@/components/csv-upload";

export function ImportTab() {
  return (
    <div className="space-y-6">
      <CsvUpload
        entityType="members"
        label="Alunos"
        description="CSV com colunas: nome, email, telefone, status, data_inscricao"
      />
      <CsvUpload
        entityType="checkins"
        label="Check-ins"
        description="CSV com colunas: aluno_email, data_checkin, duracao_minutos"
      />
      <CsvUpload
        entityType="payments"
        label="Pagamentos"
        description="CSV com colunas: aluno_email, valor, data_vencimento, data_pagamento, status"
      />
    </div>
  );
}
