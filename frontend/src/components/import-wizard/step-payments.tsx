"use client";

import { useCallback, useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ImportError } from "@/types/upload";
import type { ParsedPayment } from "@/types/import-wizard";
import {
  CsvUploadZone,
  ParseErrorBanner,
  PaginationControls,
} from "./csv-upload-zone";

const PAGE_SIZE = 50;

const STATUS_LABELS: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Atrasado",
  cancelled: "Cancelado",
};

interface StepPaymentsProps {
  payments: ParsedPayment[];
  excludedEmails: Set<string>;
  fileName: string | null;
  onParsed: (payments: ParsedPayment[], fileName: string) => void;
  onReset: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepPayments({
  payments,
  excludedEmails,
  fileName,
  onParsed,
  onReset,
  onBack,
  onNext,
}: StepPaymentsProps) {
  const [parseErrors, setParseErrors] = useState<ImportError[]>([]);
  const [page, setPage] = useState(0);

  const handleResult = useCallback(
    (rows: ParsedPayment[], name: string, errors: ImportError[]) => {
      onParsed(rows, name);
      setParseErrors(errors);
      setPage(0);
    },
    [onParsed],
  );

  const visible = payments.filter(
    (p) => !excludedEmails.has(p.member_email),
  );
  const filteredCount = payments.length - visible.length;
  const totalPages = Math.ceil(visible.length / PAGE_SIZE);
  const paged = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <CsvUploadZone<ParsedPayment>
        entityType="payments"
        fileName={fileName}
        onResult={handleResult}
        onReset={onReset}
      >
        {filteredCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            {filteredCount} pagamento(s) filtrado(s) (alunos desmarcados)
          </div>
        )}

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-muted">
                <th className="p-3 text-left font-medium text-muted-foreground">
                  Email Aluno
                </th>
                <th className="hidden p-3 text-left font-medium text-muted-foreground lg:table-cell">
                  Vencimento
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground">
                  Valor
                </th>
                <th className="hidden p-3 text-left font-medium text-muted-foreground lg:table-cell">
                  Pago em
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((p, i) => (
                <tr
                  key={`${p.member_email}-${p.due_date}-${i}`}
                  className="border-t"
                >
                  <td className="p-3">{p.member_email}</td>
                  <td className="hidden p-3 lg:table-cell">{p.due_date}</td>
                  <td className="p-3">
                    R$ {p.amount.toFixed(2).replace(".", ",")}
                  </td>
                  <td className="hidden p-3 text-muted-foreground lg:table-cell">
                    {p.paid_at || "—"}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={
                        p.status === "overdue" || p.status === "cancelled"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-[11px]"
                    >
                      {STATUS_LABELS[p.status] || p.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationControls
          page={page}
          totalPages={totalPages}
          totalItems={visible.length}
          label="pagamentos"
          onPageChange={setPage}
        />

        <ParseErrorBanner errors={parseErrors} />
      </CsvUploadZone>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onNext}>Avancar</Button>
      </div>
    </>
  );
}
