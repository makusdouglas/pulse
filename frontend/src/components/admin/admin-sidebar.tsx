"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Ticket,
  Users,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/academias", label: "Academias", icon: Building2 },
  { href: "/admin/assinaturas", label: "Assinaturas", icon: CreditCard },
  { href: "/admin/cupons", label: "Cupons", icon: Ticket },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col bg-foreground text-background">
      <div className="flex h-14 items-center px-5">
        <Link href="/admin/dashboard" className="text-lg font-bold">
          Pulse Admin
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-background/10 font-medium text-background"
                  : "text-background/60 hover:bg-background/5 hover:text-background",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-background/10 p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-background/60 hover:bg-background/5 hover:text-background"
          onClick={() => {
            // TODO: clear admin JWT and redirect
            window.location.href = "/admin/login";
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    </aside>
  );
}
