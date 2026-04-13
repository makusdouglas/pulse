import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ClerkAuthGuard } from '../../../../infra/auth/clerk-auth.guard';
import { EntityType } from '../../../../domain/use-cases/import/parse-csv';
import { DownloadTemplateSwagger } from './decorators';

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
export class DownloadTemplateController {
  @Get('wizard/template/:entityType')
  @DownloadTemplateSwagger()
  async handle(@Param('entityType') entityType: string, @Res() res: Response) {
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
