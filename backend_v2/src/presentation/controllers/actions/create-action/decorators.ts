import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateActionResponse } from './response';

export function CreateActionSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a retention action' }),
    ApiResponse({ status: 201, description: 'Action created', type: CreateActionResponse }),
  );
}
