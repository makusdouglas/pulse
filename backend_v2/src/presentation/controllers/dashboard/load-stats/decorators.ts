import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function LoadStatsSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Get dashboard statistics' }),
    ApiResponse({ status: 200, description: 'Dashboard stats' }),
  );
}
