import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UpdateSettingsResponse } from './response';

export function UpdateSettingsSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Update gym settings' }),
    ApiResponse({ status: 200, description: 'Updated gym settings', type: UpdateSettingsResponse }),
  );
}
