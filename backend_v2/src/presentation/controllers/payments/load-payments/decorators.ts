import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoadPaymentsResponse } from './response';

export function LoadPaymentsSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'List payments' }),
    ApiResponse({ status: 200, description: 'Paginated payments', type: LoadPaymentsResponse }),
  );
}
