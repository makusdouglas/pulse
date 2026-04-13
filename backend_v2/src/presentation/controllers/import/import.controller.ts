import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ClerkAuthGuard } from '../../../infra/auth/clerk-auth.guard';
import {
  ParseCsv,
  EntityType,
} from '../../../domain/use-cases/import/parse-csv';

const TEMPLATES: Record<EntityType, { header: string; example: string }> = {
  members: {
    header: 'nome,email,telefone,matricula_em,cancelamento_em',
    example: 'João Silva,joao@example.com,11999990000,15/03/2024,',
  },
  checkins: {
    header: 'email_aluno,data_hora,duracao_min',
    example: 'joao@example.com,15/03/2024 10:30,60',
  },
  payments: {
    header: 'email_aluno,vencimento,valor,status,pago_em',
    example: 'joao@example.com,15/03/2024,99.90,pago,15/03/2024',
  },
};

@ApiTags('Import')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('import')
export class ImportController {
  constructor(private readonly parseCsv: ParseCsv) {}

  @Post('wizard/preview')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Preview CSV import (no persistence)' })
  @ApiResponse({ status: 200, description: 'Parsed rows and errors' })
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
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

  @Get('wizard/template/:entityType')
  @ApiOperation({ summary: 'Download CSV template' })
  @ApiResponse({ status: 200, description: 'CSV template file' })
  async downloadTemplate(
    @Param('entityType') entityType: string,
    @Res() res: Response,
  ) {
    const template = TEMPLATES[entityType as EntityType];
    if (!template) {
      res.status(400).json({ error: `Invalid entity type: ${entityType}` });
      return;
    }

    const csv = `${template.header}\n${template.example}\n`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${entityType}_template.csv"`,
    );
    res.send(csv);
  }
}
