import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthenticateAdminResponse } from './response';

export function AuthenticateAdminSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Admin login' }),
    ApiResponse({ status: 200, description: 'Login successful', type: AuthenticateAdminResponse }),
    ApiResponse({ status: 401, description: 'Invalid credentials' }),
  );
}
