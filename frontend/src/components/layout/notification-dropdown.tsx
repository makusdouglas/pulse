"use client";

import { Bell, AlertTriangle, CheckCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const mockNotifications = [
  {
    id: "1",
    icon: AlertTriangle,
    iconColor: "text-destructive",
    title: "Aluno atingiu score critico",
    description: "Ana Silva atingiu score 82 — acao urgente",
    time: "ha 2 min",
  },
  {
    id: "2",
    icon: CheckCircle,
    iconColor: "text-muted-foreground",
    title: "Acao enviada com sucesso",
    description: "WhatsApp para Carlos Mendes foi entregue",
    time: "ha 1 hora",
  },
  {
    id: "3",
    icon: CreditCard,
    iconColor: "text-muted-foreground",
    title: "Pagamento atrasado detectado",
    description: "Ana Silva — R$ 149,90 vencido em 15/03",
    time: "ha 3 horas",
  },
];

export function NotificationDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">Notificacoes</p>
          <Button variant="ghost" size="sm" className="text-xs">
            Marcar lidas
          </Button>
        </div>
        <DropdownMenuSeparator />
        {mockNotifications.map((notif) => (
          <div
            key={notif.id}
            className="flex gap-3 px-4 py-3 hover:bg-secondary/50"
          >
            <notif.icon
              className={`mt-0.5 h-5 w-5 flex-shrink-0 ${notif.iconColor}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{notif.title}</p>
              <p className="text-xs text-muted-foreground">
                {notif.description}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {notif.time}
              </p>
            </div>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
