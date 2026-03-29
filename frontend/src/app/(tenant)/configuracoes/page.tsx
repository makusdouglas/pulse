"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralTab } from "@/components/settings/general-tab";
import { SubscriptionTab } from "@/components/settings/subscription-tab";
import { IntegrationsTab } from "@/components/settings/integrations-tab";
import { ImportTab } from "@/components/settings/import-tab";
import { TeamTab } from "@/components/settings/team-tab";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracoes</h1>
        <p className="text-muted-foreground">
          Gerencie sua academia, integracoes e assinatura
        </p>
      </div>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="assinatura">Assinatura</TabsTrigger>
          <TabsTrigger value="integracoes">Integracoes</TabsTrigger>
          <TabsTrigger value="importacao">Importacao</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-6">
          <GeneralTab />
        </TabsContent>
        <TabsContent value="assinatura" className="mt-6">
          <SubscriptionTab />
        </TabsContent>
        <TabsContent value="integracoes" className="mt-6">
          <IntegrationsTab />
        </TabsContent>
        <TabsContent value="importacao" className="mt-6">
          <ImportTab />
        </TabsContent>
        <TabsContent value="equipe" className="mt-6">
          <TeamTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
