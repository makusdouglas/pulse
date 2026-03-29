"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingStep1() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");

  // TODO: create Clerk organization on submit

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Etapa 1 de 3</p>
        <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
          <div className="h-full w-1/3 rounded-full bg-foreground" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold">Dados da Academia</h2>
        <p className="text-sm text-muted-foreground">
          Preencha as informacoes basicas para comecar
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome da academia</Label>
          <Input
            placeholder="Ex: Academia Pulse Fitness"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input
              placeholder="00.000.000/0000-00"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              placeholder="(11) 99000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
        >
          Pular
        </Button>
        <Button
          onClick={() => router.push("/onboarding/step-2")}
          disabled={!name}
        >
          Proximo
        </Button>
      </div>
    </div>
  );
}
