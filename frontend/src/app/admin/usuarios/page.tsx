"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// TODO: fetch from GET /admin/users when endpoint exists
const mockUsers = [
  { name: "Admin Principal", email: "admin@pulse.com.br", role: "superadmin", status: "Ativo", lastLogin: "26/03/2026" },
  { name: "Financeiro", email: "finance@pulse.com.br", role: "finance", status: "Ativo", lastLogin: "25/03/2026" },
  { name: "Suporte", email: "suporte@pulse.com.br", role: "support", status: "Ativo", lastLogin: "24/03/2026" },
];

const roleLabels: Record<string, string> = {
  superadmin: "Superadmin",
  finance: "Financeiro",
  support: "Suporte",
};

export default function AdminUsuariosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">
            Gerencie usuarios administrativos
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Novo usuario
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ultimo login</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockUsers.map((user) => (
            <TableRow key={user.email}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {roleLabels[user.role] ?? user.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{user.status}</Badge>
              </TableCell>
              <TableCell>{user.lastLogin}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
