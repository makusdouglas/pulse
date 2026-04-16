import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoadMembersResponse } from './response';

export function LoadMembersSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'List members' }),
    ApiResponse({ status: 200, description: 'Paginated list of members', type: LoadMembersResponse }),
  );
}
