import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function LoadAtRiskSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'List at-risk members' }),
    ApiResponse({ status: 200, description: 'Paginated at-risk members' }),
  );
}
