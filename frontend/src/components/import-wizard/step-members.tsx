"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ImportError } from "@/types/upload";
import type { ParsedMember } from "@/types/import-wizard";
import {
  CsvUploadZone,
  ParseErrorBanner,
  PaginationControls,
} from "./csv-upload-zone";

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
  const [parseErrors, setParseErrors] = useState<ImportError[]>([]);
  const [page, setPage] = useState(0);

  const uploaded = fileName !== null;

  const handleResult = useCallback(
    (rows: ParsedMember[], name: string, errors: ImportError[]) => {
      onParsed(rows, name);
      setParseErrors(errors);
      setPage(0);
    },
    [onParsed],
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
      <CsvUploadZone<ParsedMember>
        entityType="members"
        fileName={fileName}
        onResult={handleResult}
        onReset={onReset}
      >
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
                    className={cn("border-t", excluded && "opacity-50")}
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
                    <td className="hidden p-3 lg:table-cell">{m.email}</td>
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

        <PaginationControls
          page={page}
          totalPages={totalPages}
          totalItems={members.length}
          label="alunos"
          extraInfo={`${selectedCount} selecionados`}
          onPageChange={setPage}
        />

        <ParseErrorBanner errors={parseErrors} />
      </CsvUploadZone>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={selectedCount === 0 || !uploaded}>
          Avancar
        </Button>
      </div>
    </>
  );
}
