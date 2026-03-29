"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

// TODO: fetch from GET /admin/gyms when endpoint exists
const mockGyms = [
  { id: "1", name: "Academia Pulse Fitness", plan: "Profissional", status: "Ativo", mrr: "R$ 297", members: 847, date: "15/01/2025" },
  { id: "2", name: "FitZone SP", plan: "Starter", status: "Trial", mrr: "R$ 97", members: 234, date: "03/05/2024" },
  { id: "3", name: "Power Gym RJ", plan: "Enterprise", status: "Ativo", mrr: "R$ 597", members: 1523, date: "20/02/2026" },
  { id: "4", name: "Iron Body BH", plan: "Profissional", status: "Inativo", mrr: "R$ 0", members: 456, date: "10/11/2024" },
];

export default function AdminAcademiasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Academias</h1>
          <p className="text-muted-foreground">
            Gerencie todas as academias cadastradas
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar academias..." className="pl-9" />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>MRR</TableHead>
            <TableHead>Membros</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead>Acao</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockGyms.map((gym) => (
            <TableRow key={gym.id}>
              <TableCell className="font-medium">{gym.name}</TableCell>
              <TableCell>{gym.plan}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    gym.status === "Ativo"
                      ? "secondary"
                      : gym.status === "Trial"
                        ? "default"
                        : "destructive"
                  }
                >
                  {gym.status}
                </Badge>
              </TableCell>
              <TableCell>{gym.mrr}</TableCell>
              <TableCell>{gym.members.toLocaleString("pt-BR")}</TableCell>
              <TableCell>{gym.date}</TableCell>
              <TableCell>
                <Link
                  href={`/admin/academias/${gym.id}`}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  Ver
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
