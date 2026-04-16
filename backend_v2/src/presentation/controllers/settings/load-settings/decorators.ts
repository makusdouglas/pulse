import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoadSettingsResponse } from './response';

export function LoadSettingsSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Get gym settings' }),
    ApiResponse({ status: 200, description: 'Gym settings', type: LoadSettingsResponse }),
  );
}
