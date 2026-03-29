"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CsvUpload } from "@/components/csv-upload";

export default function OnboardingStep2() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Etapa 2 de 3</p>
        <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
          <div className="h-full w-2/3 rounded-full bg-foreground" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold">Importe seus dados</h2>
        <p className="text-sm text-muted-foreground">
          Envie seus arquivos CSV para popular a base de dados
        </p>
      </div>

      <div className="space-y-4">
        <CsvUpload
          entityType="members"
          label="Alunos"
          description="CSV com registros de alunos"
        />
        <CsvUpload
          entityType="checkins"
          label="Check-ins"
          description="CSV com dados de frequencia"
        />
        <CsvUpload
          entityType="payments"
          label="Pagamentos"
          description="CSV com historico de pagamentos"
        />
      </div>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
        >
          Pular
        </Button>
        <Button onClick={() => router.push("/onboarding/step-3")}>
          Proximo
        </Button>
      </div>
    </div>
  );
}
