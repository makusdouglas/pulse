"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Send } from "lucide-react";

interface NewActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewActionModal({ open, onOpenChange }: NewActionModalProps) {
  const [member, setMember] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [message, setMessage] = useState("");

  function handleSubmit() {
    // TODO: POST /actions when endpoint exists
    onOpenChange(false);
    setMember("");
    setChannel("whatsapp");
    setMessage("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nova Acao de Retencao</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Envie uma mensagem ou ligue para um aluno em risco
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Aluno</Label>
            <Input
              placeholder="Buscar aluno..."
              value={member}
              onChange={(e) => setMember(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Canal</Label>
            <RadioGroup
              value={channel}
              onValueChange={setChannel}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="whatsapp" id="whatsapp" />
                <Label htmlFor="whatsapp" className="font-normal">
                  WhatsApp
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="phone" id="phone" />
                <Label htmlFor="phone" className="font-normal">
                  Ligacao
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="font-normal">
                  E-mail
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              placeholder="Ola! Sentimos sua falta na academia..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!member || !message}>
              <Send className="mr-2 h-4 w-4" /> Enviar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
