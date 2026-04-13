import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function LoadSettingsSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Get gym settings' }),
    ApiResponse({ status: 200, description: 'Gym settings' }),
  );
}
