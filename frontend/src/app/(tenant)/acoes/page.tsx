"use client";

import { useState } from "react";
import { Zap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { NewActionModal } from "@/components/actions/new-action-modal";

export default function AcoesPage() {
  const [modalOpen, setModalOpen] = useState(false);

  // TODO: fetch from GET /actions when endpoint exists

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Acoes de Retencao</h1>
          <p className="text-muted-foreground">
            Gerencie acoes de retencao para alunos em risco
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Acao
        </Button>
      </div>

      <EmptyState
        icon={Zap}
        title="Nenhuma acao registrada"
        description="Crie acoes de retencao para entrar em contato com alunos em risco de cancelamento."
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Criar primeira acao
          </Button>
        }
      />

      <NewActionModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
