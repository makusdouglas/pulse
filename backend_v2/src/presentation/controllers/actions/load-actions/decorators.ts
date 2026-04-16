import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoadActionsResponse } from './response';

export function LoadActionsSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'List retention actions' }),
    ApiResponse({ status: 200, description: 'Paginated actions', type: LoadActionsResponse }),
  );
}
