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
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { API_URL, MAX_FILE_SIZE_MB } from "@/lib/constants";
import type { ImportError } from "@/types/upload";
import type { PreviewResponse } from "@/types/import-wizard";

const STEP_CONFIG = {
  members: {
    number: 1,
    title: "Envie o CSV de Alunos",
    description: "Faca upload do arquivo com os dados dos alunos",
  },
  payments: {
    number: 2,
    title: "Envie o CSV de Pagamentos",
    description: "Faca upload do arquivo com o historico de pagamentos",
  },
  checkins: {
    number: 3,
    title: "Envie o CSV de Check-ins",
    description: "Faca upload do arquivo com os dados de frequencia",
  },
} as const;

interface CsvUploadZoneProps<T> {
  entityType: "members" | "payments" | "checkins";
  fileName: string | null;
  onResult: (rows: T[], fileName: string, errors: ImportError[]) => void;
  onReset: () => void;
  children?: React.ReactNode;
}

export function CsvUploadZone<T>({
  entityType,
  fileName,
  onResult,
  onReset,
  children,
}: CsvUploadZoneProps<T>) {
  const { getToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploaded = fileName !== null;
  const config = STEP_CONFIG[entityType];

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

      try {
        const token = await getToken();
        const formData = new FormData();
        formData.append("file", file);
        formData.append("entity_type", entityType);

        const res = await api.upload<PreviewResponse<T>>(
          "/import/wizard/preview",
          formData,
          token ?? undefined,
        );

        onResult(res.rows, file.name, res.errors);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao processar arquivo",
        );
      } finally {
        setUploading(false);
      }
    },
    [entityType, getToken, onResult],
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

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-0.5">
          <p className="text-base font-semibold">
            {config.number}. {config.title}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {config.description}
          </p>
        </div>
        <a
          href={`${API_URL}/import/wizard/template/${entityType}`}
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

            {children}
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Shared sub-components ---

export function ParseErrorBanner({ errors }: { errors: ImportError[] }) {
  if (errors.length === 0) return null;

  return (
    <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
      <p className="font-medium">{errors.length} erro(s) de validacao</p>
      <ul className="mt-1 list-inside list-disc">
        {errors.slice(0, 5).map((e, i) => (
          <li key={i} className="text-xs">
            Linha {e.row}: {e.message}
          </li>
        ))}
        {errors.length > 5 && (
          <li className="text-xs">e mais {errors.length - 5} erros...</li>
        )}
      </ul>
    </div>
  );
}

export function PaginationControls({
  page,
  totalPages,
  totalItems,
  label,
  extraInfo,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  label: string;
  extraInfo?: string;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    if (totalItems > 0) {
      return (
        <p className="text-xs text-muted-foreground">
          {totalItems} {label}
          {extraInfo ? `, ${extraInfo}` : ""}
        </p>
      );
    }
    return null;
  }

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        Pagina {page + 1} de {totalPages} ({totalItems} {label}
        {extraInfo ? `, ${extraInfo}` : ""})
      </span>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Proximo
        </Button>
      </div>
    </div>
  );
}
