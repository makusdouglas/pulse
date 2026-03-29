"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// TODO: fetch from GET /admin/subscriptions when endpoint exists
const mockSubs = [
  { gym: "Academia Pulse Fitness", plan: "Profissional", status: "Ativo", mrr: "R$ 297", next: "15/04/2026" },
  { gym: "FitZone SP", plan: "Starter", status: "Trial", mrr: "R$ 97", next: "03/04/2026" },
  { gym: "Power Gym RJ", plan: "Enterprise", status: "Ativo", mrr: "R$ 597", next: "20/04/2026" },
];

export default function AdminAssinaturasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assinaturas</h1>
        <p className="text-muted-foreground">
          Gerencie assinaturas das academias
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Academia</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>MRR</TableHead>
            <TableHead>Proximo vencimento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockSubs.map((sub) => (
            <TableRow key={sub.gym}>
              <TableCell className="font-medium">{sub.gym}</TableCell>
              <TableCell>{sub.plan}</TableCell>
              <TableCell>
                <Badge variant={sub.status === "Ativo" ? "secondary" : "default"}>
                  {sub.status}
                </Badge>
              </TableCell>
              <TableCell>{sub.mrr}</TableCell>
              <TableCell>{sub.next}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
