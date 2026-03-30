"use client";

import { useCallback, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ImportError } from "@/types/upload";
import type { ParsedCheckin, WizardState } from "@/types/import-wizard";
import {
  CsvUploadZone,
  ParseErrorBanner,
  PaginationControls,
} from "./csv-upload-zone";

const PAGE_SIZE = 50;

interface StepCheckinsProps {
  wizardState: WizardState;
  fileName: string | null;
  onParsed: (checkins: ParsedCheckin[], fileName: string) => void;
  onReset: () => void;
  onBack: () => void;
  onCommit: () => void;
  committing: boolean;
}

export function StepCheckins({
  wizardState,
  fileName,
  onParsed,
  onReset,
  onBack,
  onCommit,
  committing,
}: StepCheckinsProps) {
  const [parseErrors, setParseErrors] = useState<ImportError[]>([]);
  const [page, setPage] = useState(0);

  const { members, excludedEmails, payments, checkins } = wizardState;

  const handleResult = useCallback(
    (rows: ParsedCheckin[], name: string, errors: ImportError[]) => {
      onParsed(rows, name);
      setParseErrors(errors);
      setPage(0);
    },
    [onParsed],
  );

  const selectedMembers = members.filter(
    (m) => !excludedEmails.has(m.email),
  );
  const selectedEmails = new Set(selectedMembers.map((m) => m.email));
  const newMembers = selectedMembers.filter((m) => !m.exists).length;
  const updatedMembers = selectedMembers.filter((m) => m.exists).length;

  const visibleCheckins = checkins.filter((c) =>
    selectedEmails.has(c.member_email),
  );
  const filteredCheckinsCount = checkins.length - visibleCheckins.length;

  const visiblePayments = payments.filter((p) =>
    selectedEmails.has(p.member_email),
  );

  const totalPages = Math.ceil(visibleCheckins.length / PAGE_SIZE);
  const paged = visibleCheckins.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  return (
    <>
      <CsvUploadZone<ParsedCheckin>
        entityType="checkins"
        fileName={fileName}
        onResult={handleResult}
        onReset={onReset}
      >
        {filteredCheckinsCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            {filteredCheckinsCount} check-in(s) filtrado(s) (alunos
            desmarcados)
          </div>
        )}

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-muted">
                <th className="p-3 text-left font-medium text-muted-foreground">
                  Email Aluno
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground">
                  Data/Hora
                </th>
                <th className="hidden p-3 text-left font-medium text-muted-foreground lg:table-cell">
                  Duracao
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c, i) => (
                <tr
                  key={`${c.member_email}-${c.ts}-${i}`}
                  className="border-t"
                >
                  <td className="p-3">{c.member_email}</td>
                  <td className="p-3">{c.ts}</td>
                  <td className="hidden p-3 lg:table-cell">
                    {c.duration_min ? `${c.duration_min} min` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationControls
          page={page}
          totalPages={totalPages}
          totalItems={visibleCheckins.length}
          label="check-ins"
          onPageChange={setPage}
        />

        <ParseErrorBanner errors={parseErrors} />
      </CsvUploadZone>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo da Importacao</CardTitle>
          <p className="text-[13px] text-muted-foreground">
            Confirme os dados antes de importar
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-2xl font-bold">{selectedMembers.length}</p>
              <p className="text-xs text-muted-foreground">
                Alunos ({newMembers} novos
                {updatedMembers > 0 && `, ${updatedMembers} atualiz.`})
              </p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-2xl font-bold">{visiblePayments.length}</p>
              <p className="text-xs text-muted-foreground">Pagamentos</p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-2xl font-bold">{visibleCheckins.length}</p>
              <p className="text-xs text-muted-foreground">Check-ins</p>
            </div>
            {excludedEmails.size > 0 && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-2xl font-bold text-destructive">
                  {excludedEmails.size}
                </p>
                <p className="text-xs text-muted-foreground">Excluidos</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onCommit} disabled={committing}>
          {committing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importando...
            </>
          ) : (
            "Importar"
          )}
        </Button>
      </div>
    </>
  );
}
