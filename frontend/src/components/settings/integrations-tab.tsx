"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export function IntegrationsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5" />
              <CardTitle className="text-base">WhatsApp (Evolution API)</CardTitle>
            </div>
            <Badge variant="outline">Desconectado</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Conecte sua instancia da Evolution API para enviar mensagens de
            retencao automaticamente via WhatsApp.
          </p>
          <Button size="sm">Conectar WhatsApp</Button>
        </CardContent>
      </Card>
    </div>
  );
}
