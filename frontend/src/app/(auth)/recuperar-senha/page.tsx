"use client";

import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RecoverPasswordPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao login
      </Link>

      <div className="space-y-4 text-center">
        <Construction className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Em breve</h2>
        <p className="text-sm text-muted-foreground">
          A recuperacao de senha estara disponivel em breve. Por enquanto, entre
          em contato com o suporte para redefinir sua senha.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/sign-in">Voltar ao login</Link>
        </Button>
      </div>
    </div>
  );
}
