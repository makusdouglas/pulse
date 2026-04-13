import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function CreateActionSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a retention action' }),
    ApiResponse({ status: 201, description: 'Action created' }),
  );
}
