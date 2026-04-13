import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function MarkNotificationReadSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Mark a notification as read' }),
    ApiResponse({ status: 204, description: 'Notification marked as read' }),
  );
}
