"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// TODO: fetch from GET /admin/gyms/{id} when endpoint exists

export default function AdminGymDetailPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Academia Pulse Fitness</h1>
            <Badge>Ativo</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Plano Profissional | Desde 15/01/2025
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Membros</p>
            <p className="text-2xl font-bold">847</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Em Risco</p>
            <p className="text-2xl font-bold">124</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Score Medio</p>
            <p className="text-2xl font-bold">32.5</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">MRR</p>
            <p className="text-2xl font-bold">R$ 297</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informacoes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">CNPJ</p>
            <p className="text-sm">12.345.678/0001-99</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">E-mail</p>
            <p className="text-sm">contato@pulsefitness.com.br</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Telefone</p>
            <p className="text-sm">(11) 99123-4567</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Endereco</p>
            <p className="text-sm">Rua das Esportes, 123 — Sao Paulo/SP</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
