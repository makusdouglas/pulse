import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoadStatsResponse } from './response';

export function LoadStatsSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Get dashboard statistics' }),
    ApiResponse({ status: 200, description: 'Dashboard stats', type: LoadStatsResponse }),
  );
}
