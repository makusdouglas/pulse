import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function UpdateSettingsSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Update gym settings' }),
    ApiResponse({ status: 200, description: 'Updated gym settings' }),
  );
}
