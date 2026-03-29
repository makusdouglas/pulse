"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // TODO: integrate with Clerk SignUp when real keys are configured
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/onboarding/step-1");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Criar conta</h2>
        <p className="text-sm text-muted-foreground">
          Comece a usar o Pulse para sua academia
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
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
          Criar conta
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Ja tem conta?{" "}
        <Link href="/sign-in" className="font-medium text-foreground underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
