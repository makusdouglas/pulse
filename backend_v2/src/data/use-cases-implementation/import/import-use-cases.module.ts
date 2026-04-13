import { Module } from '@nestjs/common';
import { ParseCsv } from '../../../domain/use-cases/import/parse-csv';
import { ParseCsvService } from './parse-csv.service';

@Module({
  providers: [{ provide: ParseCsv, useClass: ParseCsvService }],
  exports: [ParseCsv],
})
export class ImportUseCasesModule {}
