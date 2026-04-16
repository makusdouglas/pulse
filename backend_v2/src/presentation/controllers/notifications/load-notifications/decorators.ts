import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoadNotificationsResponse } from './response';

export function LoadNotificationsSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'List notifications' }),
    ApiResponse({ status: 200, description: 'Paginated notifications', type: LoadNotificationsResponse }),
  );
}
