"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "email" | "code" | "password" | "success";

export default function RecoverPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  // TODO: integrate with Clerk password reset API

  if (step === "success") {
    return (
      <div className="space-y-6 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <h2 className="text-2xl font-bold">Senha alterada!</h2>
        <p className="text-sm text-muted-foreground">
          Sua senha foi redefinida com sucesso.
        </p>
        <Button asChild className="w-full">
          <Link href="/sign-in">Voltar ao login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao login
      </Link>

      {step === "email" && (
        <>
          <div className="flex justify-center">
            <Mail className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Esqueceu sua senha?</h2>
            <p className="text-sm text-muted-foreground">
              Digite seu e-mail e enviaremos um link para redefinir sua senha.
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => setStep("code")}
              disabled={!email}
            >
              Enviar link
            </Button>
          </div>
        </>
      )}

      {step === "code" && (
        <>
          <div>
            <h2 className="text-2xl font-bold">Verificar codigo</h2>
            <p className="text-sm text-muted-foreground">
              Enviamos um codigo para {email}
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Codigo</Label>
              <Input
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => setStep("password")}
              disabled={code.length < 6}
            >
              Verificar
            </Button>
          </div>
        </>
      )}

      {step === "password" && (
        <>
          <div>
            <h2 className="text-2xl font-bold">Nova senha</h2>
            <p className="text-sm text-muted-foreground">
              Escolha uma nova senha para sua conta.
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => setStep("success")}
              disabled={password.length < 8}
            >
              Redefinir senha
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
