"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SubscriptionTab() {
  // TODO: integrate with Stripe

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Plano Atual</CardTitle>
            <Badge>Profissional</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="text-lg font-bold">R$ 297/mes</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Proximo vencimento</p>
              <p className="text-sm font-medium">15/04/2026</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Limite de alunos</p>
              <p className="text-sm font-medium">500</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Alterar plano
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive">
              Cancelar assinatura
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
