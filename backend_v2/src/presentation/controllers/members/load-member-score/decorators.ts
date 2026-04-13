import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function LoadMemberScoreSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Get member score (on-demand)' }),
    ApiResponse({ status: 200, description: 'Member score with signals' }),
  );
}
