"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

export function TeamTab() {
  // TODO: use Clerk useOrganization() for real member data

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Convidar membro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">E-mail do membro</Label>
              <Input placeholder="colaborador@academia.com" />
            </div>
            <div className="w-full space-y-1 sm:w-40">
              <Label className="text-xs">Cargo</Label>
              <Select defaultValue="member">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Membro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> Convidar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Joao Silva</p>
                <p className="text-xs text-muted-foreground">
                  joao@academia.com
                </p>
              </div>
              <Badge>Admin</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Maria Santos</p>
                <p className="text-xs text-muted-foreground">
                  maria@academia.com
                </p>
              </div>
              <Badge variant="outline">Membro</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
