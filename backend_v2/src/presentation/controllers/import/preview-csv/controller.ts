import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import {
  ParseCsv,
  EntityType,
} from '../../../../domain/use-cases/import/parse-csv';
import { PreviewCsvSwagger } from './decorators';

@ApiTags('Import')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('import')
export class PreviewCsvController {
  constructor(private readonly parseCsv: ParseCsv) {}

  @Post('wizard/preview')
  @UseInterceptors(FileInterceptor('file'))
  @PreviewCsvSwagger()
  async handle(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const entityType = (req.body?.entity_type ?? 'members') as EntityType;

    if (!file) {
      return { error: 'File is required' };
    }

    const result = await this.parseCsv.execute(file.buffer, entityType);

    return {
      entity_type: entityType,
      rows: result.rows,
      errors: result.errors,
      total_rows: result.totalRows,
    };
  }
}
