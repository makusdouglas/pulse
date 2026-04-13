import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function DownloadTemplateSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Download CSV template' }),
    ApiResponse({ status: 200, description: 'CSV template file' }),
  );
}
