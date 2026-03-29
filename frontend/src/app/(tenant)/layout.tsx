"use client";

import { useState } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";

function TenantShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <MobileSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto px-5 py-6 lg:px-10 lg:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!clerkKey || clerkKey.includes("placeholder")) {
    return <TenantShell>{children}</TenantShell>;
  }

  return (
    <ClerkProvider publishableKey={clerkKey} localization={ptBR}>
      <TenantShell>{children}</TenantShell>
    </ClerkProvider>
  );
}
