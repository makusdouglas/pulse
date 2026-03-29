"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeamMember {
  email: string;
  role: string;
}

export default function OnboardingStep3() {
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([
    { email: "", role: "member" },
  ]);

  function addMember() {
    setMembers([...members, { email: "", role: "member" }]);
  }

  function removeMember(index: number) {
    setMembers(members.filter((_, i) => i !== index));
  }

  function updateMember(index: number, field: keyof TeamMember, value: string) {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  }

  // TODO: send Clerk org invitations on submit

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Etapa 3 de 3</p>
        <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
          <div className="h-full w-full rounded-full bg-foreground" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold">Convide sua equipe</h2>
        <p className="text-sm text-muted-foreground">
          Adicione membros da equipe para colaborar na plataforma
        </p>
      </div>

      <div className="space-y-3">
        {members.map((member, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">E-mail do membro</Label>
              <Input
                placeholder="colaborador@academia.com"
                value={member.email}
                onChange={(e) => updateMember(i, "email", e.target.value)}
              />
            </div>
            <div className="w-32 space-y-1">
              <Label className="text-xs">Cargo</Label>
              <Select
                value={member.role}
                onValueChange={(v) => updateMember(i, "role", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Membro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {members.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeMember(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addMember}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar outro membro
        </Button>
      </div>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
        >
          Pular
        </Button>
        <Button onClick={() => router.push("/dashboard")}>
          Concluir
        </Button>
      </div>
    </div>
  );
}
