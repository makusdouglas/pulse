import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

export function LoadCurrentAdminSwagger() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get current admin user' }),
    ApiResponse({ status: 200, description: 'Current admin user info' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
  );
}
