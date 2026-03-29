export const dynamic = "force-dynamic";

export default function TenantTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
