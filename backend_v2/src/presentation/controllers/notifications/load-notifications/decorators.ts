import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function LoadNotificationsSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'List notifications' }),
    ApiResponse({ status: 200, description: 'Paginated notifications' }),
  );
}
