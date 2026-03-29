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

// TODO: fetch from GET /admin/coupons when endpoint exists
const mockCoupons = [
  { code: "WELCOME20", discount: "20%", type: "percentual", uses: 45, max: 100, status: "Ativo", expires: "30/06/2026" },
  { code: "ANUAL50", discount: "R$ 50", type: "fixo", uses: 12, max: 50, status: "Ativo", expires: "31/12/2026" },
  { code: "TRIAL30", discount: "30 dias gratis", type: "trial", uses: 89, max: null, status: "Expirado", expires: "01/01/2026" },
];

export default function AdminCuponsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cupons</h1>
          <p className="text-muted-foreground">
            Gerencie cupons de desconto
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Novo cupom
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Codigo</TableHead>
            <TableHead>Desconto</TableHead>
            <TableHead>Usos</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expiracao</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockCoupons.map((coupon) => (
            <TableRow key={coupon.code}>
              <TableCell className="font-mono font-medium">
                {coupon.code}
              </TableCell>
              <TableCell>{coupon.discount}</TableCell>
              <TableCell>
                {coupon.uses}{coupon.max ? `/${coupon.max}` : ""}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    coupon.status === "Ativo" ? "secondary" : "outline"
                  }
                >
                  {coupon.status}
                </Badge>
              </TableCell>
              <TableCell>{coupon.expires}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
