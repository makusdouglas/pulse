"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ImportWizard } from "@/components/import-wizard/import-wizard";

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

      <ImportWizard
        onComplete={() => router.push("/onboarding/step-3")}
      />

      <div className="flex justify-start">
        <Button
          variant="ghost"
          onClick={() => router.push("/onboarding/step-3")}
        >
          Pular
        </Button>
      </div>
    </div>
  );
}
