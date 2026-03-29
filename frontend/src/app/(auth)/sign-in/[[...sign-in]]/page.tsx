"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // TODO: integrate with Clerk SignIn when real keys are configured
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Entrar no Pulse</h2>
        <p className="text-sm text-muted-foreground">
          Acesse sua conta para gerenciar sua academia
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Nao tem conta?{" "}
        <Link href="/sign-up" className="font-medium text-foreground underline">
          Criar conta
        </Link>
      </p>
      <p className="text-center text-sm">
        <Link
          href="/recuperar-senha"
          className="text-muted-foreground hover:text-foreground"
        >
          Esqueceu sua senha?
        </Link>
      </p>
    </div>
  );
}
