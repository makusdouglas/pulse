export interface Gym {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  clerkOrgId: string | null;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}
