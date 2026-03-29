"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  AlertCircle,
  Download,
  Info,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { MAX_FILE_SIZE_MB } from "@/lib/constants";
import type { ImportError } from "@/types/upload";
import type { ParsedPayment, PreviewResponse } from "@/types/import-wizard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
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
  const { getToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<ImportError[]>([]);
  const [page, setPage] = useState(0);

  const uploaded = fileName !== null;

  const handleUpload = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`Arquivo excede o limite de ${MAX_FILE_SIZE_MB}MB`);
        return;
      }
      if (!file.name.endsWith(".csv")) {
        setError("Apenas arquivos CSV sao aceitos");
        return;
      }

      setUploading(true);
      setError(null);
      setParseErrors([]);

      try {
        const token = await getToken();
        const formData = new FormData();
        formData.append("file", file);
        formData.append("entity_type", "payments");

        const res = await api.upload<PreviewResponse<ParsedPayment>>(
          "/import/wizard/preview",
          formData,
          token ?? undefined,
        );

        onParsed(res.rows, file.name);
        if (res.errors.length > 0) setParseErrors(res.errors);
        setPage(0);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao processar arquivo",
        );
      } finally {
        setUploading(false);
      }
    },
    [getToken, onParsed],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const visible = payments.filter(
    (p) => !excludedEmails.has(p.member_email),
  );
  const filteredCount = payments.length - visible.length;
  const totalPages = Math.ceil(visible.length / PAGE_SIZE);
  const paged = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-0.5">
            <p className="text-base font-semibold">
              2. Envie o CSV de Pagamentos
            </p>
            <p className="text-[13px] text-muted-foreground">
              Faca upload do arquivo com o historico de pagamentos
            </p>
          </div>
          <a
            href={`${API_URL}/import/wizard/template/payments`}
            className="flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar modelo
          </a>
        </CardHeader>

        <CardContent className="space-y-4">
          {!uploaded && (
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50",
                uploading && "pointer-events-none opacity-50",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {uploading ? (
                <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              )}
              <p className="mb-2 text-sm text-muted-foreground">
                Arraste o CSV aqui ou
              </p>
              <label>
                <Button variant="outline" size="sm" asChild>
                  <span>Selecionar arquivo</span>
                </Button>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </label>
            </div>
          )}

          {uploaded && (
            <>
              <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                <span className="font-medium">{fileName}</span>
                <button
                  type="button"
                  onClick={onReset}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  Reenviar CSV
                </button>
              </div>

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
                      <tr key={`${p.member_email}-${p.due_date}-${i}`} className="border-t">
                        <td className="p-3">{p.member_email}</td>
                        <td className="hidden p-3 lg:table-cell">
                          {p.due_date}
                        </td>
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Pagina {page + 1} de {totalPages} ({visible.length}{" "}
                    pagamentos)
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Proximo
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {parseErrors.length > 0 && (
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
              <p className="font-medium">
                {parseErrors.length} erro(s) de validacao
              </p>
              <ul className="mt-1 list-inside list-disc">
                {parseErrors.slice(0, 5).map((e, i) => (
                  <li key={i} className="text-xs">
                    Linha {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onNext}>Avancar</Button>
      </div>
    </>
  );
}
