"use client";

import { useEffect } from "react";
import { useAuth, useOrganizationList, useSession } from "@clerk/nextjs";

export function OrgGuard({ children }: { children: React.ReactNode }) {
  const { orgId } = useAuth();
  const { session } = useSession();
  const { userMemberships, setActive, isLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  useEffect(() => {
    if (!isLoaded || orgId) return;

    const firstOrg = userMemberships?.data?.[0]?.organization;
    if (firstOrg && setActive) {
      setActive({ organization: firstOrg.id }).then(() => {
        // Force cookie refresh so server-side sees orgId
        session?.getToken({ skipCache: true });
      });
    }
  }, [isLoaded, orgId, userMemberships?.data, setActive, session]);

  return <>{children}</>;
}
