"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  AlertCircle,
  Download,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { API_URL, MAX_FILE_SIZE_MB } from "@/lib/constants";
import type { ImportError } from "@/types/upload";
import type { ParsedMember, PreviewResponse } from "@/types/import-wizard";
const PAGE_SIZE = 50;

interface StepMembersProps {
  members: ParsedMember[];
  excludedEmails: Set<string>;
  fileName: string | null;
  onParsed: (members: ParsedMember[], fileName: string) => void;
  onExcludedChange: (emails: Set<string>) => void;
  onReset: () => void;
  onNext: () => void;
}

export function StepMembers({
  members,
  excludedEmails,
  fileName,
  onParsed,
  onExcludedChange,
  onReset,
  onNext,
}: StepMembersProps) {
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
        formData.append("entity_type", "members");

        const res = await api.upload<PreviewResponse<ParsedMember>>(
          "/import/wizard/preview",
          formData,
          token ?? undefined,
        );

        onParsed(res.rows, file.name);
        if (res.errors.length > 0) {
          setParseErrors(res.errors);
        }
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

  const toggleEmail = useCallback(
    (email: string) => {
      const next = new Set(excludedEmails);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      onExcludedChange(next);
    },
    [excludedEmails, onExcludedChange],
  );

  const toggleAll = useCallback(() => {
    if (excludedEmails.size === 0) {
      onExcludedChange(new Set(members.map((m) => m.email)));
    } else {
      onExcludedChange(new Set());
    }
  }, [excludedEmails, members, onExcludedChange]);

  const selectedCount = members.length - excludedEmails.size;
  const totalPages = Math.ceil(members.length / PAGE_SIZE);
  const pagedMembers = members.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-0.5">
            <p className="text-base font-semibold">1. Envie o CSV de Alunos</p>
            <p className="text-[13px] text-muted-foreground">
              Faca upload do arquivo com os dados dos alunos
            </p>
          </div>
          <a
            href={`${API_URL}/import/wizard/template/members`}
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

              {/* Members table */}
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-muted">
                      <th className="w-[52px] p-3">
                        <Checkbox
                          checked={
                            excludedEmails.size === 0
                              ? true
                              : excludedEmails.size === members.length
                                ? false
                                : "indeterminate"
                          }
                          onCheckedChange={toggleAll}
                        />
                      </th>
                      <th className="p-3 text-left font-medium text-muted-foreground">
                        Nome
                      </th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground lg:table-cell">
                        Email
                      </th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground lg:table-cell">
                        Telefone
                      </th>
                      <th className="hidden p-3 text-left font-medium text-muted-foreground lg:table-cell">
                        Matricula
                      </th>
                      <th className="p-3 text-left font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedMembers.map((m) => {
                      const excluded = excludedEmails.has(m.email);
                      return (
                        <tr
                          key={m.email}
                          className={cn(
                            "border-t",
                            excluded && "opacity-50",
                          )}
                        >
                          <td className="p-3">
                            <Checkbox
                              checked={!excluded}
                              onCheckedChange={() => toggleEmail(m.email)}
                            />
                          </td>
                          <td className="p-3">
                            <div>
                              <span className="font-medium">{m.name}</span>
                              <span className="block text-xs text-muted-foreground lg:hidden">
                                {m.email}
                              </span>
                            </div>
                          </td>
                          <td className="hidden p-3 lg:table-cell">
                            {m.email}
                          </td>
                          <td className="hidden p-3 lg:table-cell">
                            {m.phone || "—"}
                          </td>
                          <td className="hidden p-3 lg:table-cell">
                            {m.enrolled_at || "—"}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {m.status === "cancelled" ? (
                                <Badge variant="destructive" className="text-[11px]">
                                  Cancelado
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[11px]">
                                  Ativo
                                </Badge>
                              )}
                              {m.exists && (
                                <Badge
                                  variant="outline"
                                  className="border-yellow-500 text-[11px] text-yellow-600"
                                >
                                  Ja cadastrado
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Pagina {page + 1} de {totalPages} ({members.length} alunos,{" "}
                    {selectedCount} selecionados)
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

              {members.length > 0 && totalPages <= 1 && (
                <p className="text-xs text-muted-foreground">
                  {members.length} alunos, {selectedCount} selecionados
                </p>
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
                {parseErrors.length > 5 && (
                  <li className="text-xs">
                    e mais {parseErrors.length - 5} erros...
                  </li>
                )}
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

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={selectedCount === 0 || !uploaded}>
          Avancar
        </Button>
      </div>
    </>
  );
}
