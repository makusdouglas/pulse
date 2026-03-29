"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// TODO: fetch from GET /admin/dashboard when endpoint exists
const mockStats = {
  total_gyms: 47,
  mrr: 13959,
  active_gyms: 42,
  churn_rate: 2.1,
};

const mockGyms = [
  { name: "Academia Pulse Fitness", plan: "Profissional", date: "15/01/2025", status: "Ativo", members: 847 },
  { name: "FitZone SP", plan: "Starter", date: "03/05/2024", status: "Trial", members: 234 },
  { name: "Power Gym RJ", plan: "Enterprise", date: "20/02/2026", status: "Ativo", members: 1523 },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visao geral da plataforma Pulse
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Total Academias
            </p>
            <p className="mt-2 text-3xl font-bold">{mockStats.total_gyms}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              MRR
            </p>
            <p className="mt-2 text-3xl font-bold">
              R$ {mockStats.mrr.toLocaleString("pt-BR")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Academias Ativas
            </p>
            <p className="mt-2 text-3xl font-bold">{mockStats.active_gyms}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Churn SaaS
            </p>
            <p className="mt-2 text-3xl font-bold">{mockStats.churn_rate}%</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Ultimas Academias</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Membros</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockGyms.map((gym) => (
              <TableRow key={gym.name}>
                <TableCell className="font-medium">{gym.name}</TableCell>
                <TableCell>{gym.plan}</TableCell>
                <TableCell>{gym.date}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      gym.status === "Ativo"
                        ? "secondary"
                        : gym.status === "Trial"
                          ? "default"
                          : "outline"
                    }
                  >
                    {gym.status}
                  </Badge>
                </TableCell>
                <TableCell>{gym.members.toLocaleString("pt-BR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
