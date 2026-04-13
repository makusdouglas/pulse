import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function CheckHealthSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Health check' }),
    ApiResponse({ status: 200, description: 'Service is healthy' }),
  );
}
