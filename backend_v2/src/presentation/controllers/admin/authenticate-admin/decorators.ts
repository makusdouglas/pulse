import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function AuthenticateAdminSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Admin login' }),
    ApiResponse({ status: 200, description: 'Login successful' }),
    ApiResponse({ status: 401, description: 'Invalid credentials' }),
  );
}
