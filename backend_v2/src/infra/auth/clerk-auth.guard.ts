import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwksClient } from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

let jwksClient: JwksClient | null = null;

function getJwksClient(): JwksClient {
  if (!jwksClient) {
    if (!ENV.CLERK_JWKS_URL) {
      throw new UnauthorizedException('CLERK_JWKS_URL not configured');
    }
    jwksClient = new JwksClient({
      jwksUri: ENV.CLERK_JWKS_URL,
      cache: true,
      rateLimit: true,
    });
  }
  return jwksClient;
}

export function extractGymId(payload: Record<string, unknown>): string {
  const orgClaim = payload['o'];
  let orgId: string | undefined;

  if (typeof orgClaim === 'object' && orgClaim !== null) {
    orgId = (orgClaim as Record<string, unknown>)['id'] as string;
  } else {
    orgId = payload['org_id'] as string;
  }

  if (!orgId) {
    throw new UnauthorizedException(
      'User must belong to an organization',
    );
  }
  return orgId;
}

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid authorization header',
      );
    }

    const token = authHeader.slice(7).trim();

    try {
      const client = getJwksClient();
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        throw new UnauthorizedException('Invalid token');
      }

      const key = await client.getSigningKey(decoded.header.kid);
      const signingKey = key.getPublicKey();

      const payload = jwt.verify(token, signingKey, {
        algorithms: ['RS256'],
      }) as Record<string, unknown>;

      const clerkOrgId = extractGymId(payload);

      request.clerkOrgId = clerkOrgId;
      request.clerkPayload = payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;

      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }
}
