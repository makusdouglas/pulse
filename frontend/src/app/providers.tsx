"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";

export function ClerkProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClerkProvider localization={ptBR}>{children}</ClerkProvider>;
}
