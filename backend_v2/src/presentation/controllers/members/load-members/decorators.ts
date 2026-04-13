import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function LoadMembersSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'List members' }),
    ApiResponse({ status: 200, description: 'Paginated list of members' }),
  );
}
