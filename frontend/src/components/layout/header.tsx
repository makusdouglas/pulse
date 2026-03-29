"use client";

import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationDropdown } from "@/components/layout/notification-dropdown";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
      <Button variant="ghost" size="sm" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <span className="text-lg font-bold">Pulse</span>

      <NotificationDropdown />
    </header>
  );
}
