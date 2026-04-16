import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function MarkAllNotificationsReadSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Mark all notifications as read' }),
    ApiResponse({
      status: 204,
      description: 'All notifications marked as read',
    }),
  );
}
