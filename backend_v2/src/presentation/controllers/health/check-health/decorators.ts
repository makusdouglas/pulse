import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CheckHealthResponse } from './response';

export function CheckHealthSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Health check' }),
    ApiResponse({ status: 200, description: 'Service is healthy', type: CheckHealthResponse }),
  );
}
