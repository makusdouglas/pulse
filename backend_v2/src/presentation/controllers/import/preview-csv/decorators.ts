import { applyDecorators } from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiResponse } from '@nestjs/swagger';

export function PreviewCsvSwagger() {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiOperation({ summary: 'Preview CSV import' }),
    ApiResponse({ status: 200, description: 'Parsed rows and errors' }),
  );
}
