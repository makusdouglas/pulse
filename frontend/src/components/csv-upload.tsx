"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { MAX_FILE_SIZE_MB } from "@/lib/constants";
import type { ImportResponse } from "@/types/upload";

interface CsvUploadProps {
  entityType: "members" | "checkins" | "payments";
  label: string;
  description?: string;
  onSuccess?: (result: ImportResponse) => void;
  className?: string;
}

export function CsvUpload({
  entityType,
  label,
  description,
  onSuccess,
  className,
}: CsvUploadProps) {
  const { getToken } = useAuth();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setResult(null);

      try {
        const token = await getToken();
        const formData = new FormData();
        formData.append("file", file);
        formData.append("entity_type", entityType);

        const response = await api.upload<ImportResponse>(
          "/import/csv",
          formData,
          token ?? undefined,
        );

        setResult(response);
        onSuccess?.(response);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao importar arquivo",
        );
      } finally {
        setUploading(false);
      }
    },
    [entityType, getToken, onSuccess],
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
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>

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

      {result && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-md p-3 text-sm",
            result.status === "ok"
              ? "bg-green-50 text-green-800"
              : result.status === "partial"
                ? "bg-yellow-50 text-yellow-800"
                : "bg-red-50 text-red-800",
          )}
        >
          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">
              {result.stats.inserted} inseridos, {result.stats.updated}{" "}
              atualizados
              {result.stats.skipped > 0 &&
                `, ${result.stats.skipped} ignorados`}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-1 list-inside list-disc">
                {result.errors.slice(0, 3).map((err, i) => (
                  <li key={i}>{err.message}</li>
                ))}
                {result.errors.length > 3 && (
                  <li>e mais {result.errors.length - 3} erros...</li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
