import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoadCurrentAdminResponse } from './response';

export function LoadCurrentAdminSwagger() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get current admin user' }),
    ApiResponse({ status: 200, description: 'Current admin user info', type: LoadCurrentAdminResponse }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
  );
}
