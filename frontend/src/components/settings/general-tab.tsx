"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export function GeneralTab() {
  // TODO: fetch from GET /gym/settings when endpoint exists

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Perfil da Academia</CardTitle>
          <Button variant="outline" size="sm">
            Editar
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">
              Nome da academia
            </Label>
            <p className="text-sm font-medium">Academia Pulse Fitness</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">CNPJ</Label>
            <p className="text-sm font-medium">12.345.678/0001-99</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <p className="text-sm font-medium">
              contato@pulsefitness.com.br
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Telefone</Label>
            <p className="text-sm font-medium">(11) 99123-4567</p>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Endereco</Label>
            <p className="text-sm font-medium">
              Rua das Esportes, 123 — Sao Paulo/SP
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notificacoes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure como deseja receber alertas
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Alertas por e-mail</p>
              <p className="text-xs text-muted-foreground">
                Enviar notificacoes de risco por e-mail
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Alertas por WhatsApp</p>
              <p className="text-xs text-muted-foreground">
                Receba alertas de acoes via WhatsApp
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Relatorio semanal</p>
              <p className="text-xs text-muted-foreground">
                Resumo semanal de retencao por e-mail
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Alerta de risco critico</p>
              <p className="text-xs text-muted-foreground">
                Notificacao quando score atinge &gt; 60
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
