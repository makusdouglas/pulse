export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-lg rounded-xl border bg-background p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
