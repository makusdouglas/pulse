export const ENV = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://churn:churn123@localhost:5432/churndb',

  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? '',
  CLERK_JWKS_URL: process.env.CLERK_JWKS_URL ?? '',

  CORS_ORIGINS: process.env.CORS_ORIGINS ?? 'http://localhost:3000',

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',

  ADMIN_JWT_SECRET:
    process.env.ADMIN_JWT_SECRET ?? 'change-me-to-a-random-256-bit-secret',

  APP_PORT: parseInt(process.env.APP_PORT ?? '8000', 10),

  get corsOriginsList(): string[] {
    return this.CORS_ORIGINS.split(',')
      .map((o: string) => o.trim())
      .filter(Boolean);
  },
};
