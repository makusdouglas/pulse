import { ParseCsvService } from './parse-csv.service';

function csv(lines: string[]): Buffer {
  return Buffer.from(lines.join('\n'), 'utf-8');
}

describe('ParseCsvService', () => {
  let service: ParseCsvService;

  beforeEach(() => {
    service = new ParseCsvService();
  });

  // ── Members ──────────────────────────────────────────────────
  describe('members', () => {
    it('should parse valid members CSV', async () => {
      const file = csv([
        'nome,email,telefone,matricula_em',
        'João Silva,joao@test.com,11999990000,15/03/2024',
        'Maria Lima,maria@test.com,,01/01/2023',
      ]);
      const result = await service.execute(file, 'members');
      expect(result.totalRows).toBe(2);
      expect(result.rows).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.rows[0]).toMatchObject({
        name: 'João Silva',
        email: 'joao@test.com',
        phone: '11999990000',
        status: 'active',
      });
      expect(result.rows[1]).toMatchObject({
        name: 'Maria Lima',
        email: 'maria@test.com',
        phone: null,
      });
    });

    it('should set status cancelled when cancelamento_em is present', async () => {
      const file = csv([
        'nome,email,telefone,matricula_em,cancelamento_em',
        'Ana,ana@test.com,,01/01/2023,15/06/2024',
      ]);
      const result = await service.execute(file, 'members');
      expect(result.rows[0]).toMatchObject({
        status: 'cancelled',
      });
      expect(result.rows[0]['cancelled_at']).toBeTruthy();
    });

    it('should report error for missing name', async () => {
      const file = csv([
        'nome,email,telefone,matricula_em',
        ',joao@test.com,,15/03/2024',
      ]);
      const result = await service.execute(file, 'members');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('nome');
      expect(result.rows).toHaveLength(0);
    });

    it('should report error for invalid email', async () => {
      const file = csv([
        'nome,email,telefone,matricula_em',
        'João,not-an-email,,15/03/2024',
      ]);
      const result = await service.execute(file, 'members');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('email');
    });

    it('should report error for invalid date format', async () => {
      const file = csv([
        'nome,email,telefone,matricula_em',
        'João,joao@test.com,,99/99/2024',
      ]);
      const result = await service.execute(file, 'members');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('matricula_em');
    });

    it('should handle yyyy-mm-dd date format', async () => {
      const file = csv([
        'nome,email,telefone,matricula_em',
        'João,joao@test.com,,2024-03-15',
      ]);
      const result = await service.execute(file, 'members');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]['enrolled_at']).toBeTruthy();
    });

    it('should lowercase emails', async () => {
      const file = csv([
        'nome,email,telefone,matricula_em',
        'João,JOAO@TEST.COM,,15/03/2024',
      ]);
      const result = await service.execute(file, 'members');
      expect(result.rows[0]['email']).toBe('joao@test.com');
    });
  });

  // ── Checkins ─────────────────────────────────────────────────
  describe('checkins', () => {
    it('should parse valid checkins CSV', async () => {
      const file = csv([
        'email_aluno,data_hora,duracao_min',
        'joao@test.com,15/03/2024 10:30,60',
        'maria@test.com,2024-03-15T14:00:00,',
      ]);
      const result = await service.execute(file, 'checkins');
      expect(result.totalRows).toBe(2);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toMatchObject({
        member_email: 'joao@test.com',
        duration_min: 60,
      });
      expect(result.rows[1]).toMatchObject({
        member_email: 'maria@test.com',
        duration_min: null,
      });
    });

    it('should report error for missing timestamp', async () => {
      const file = csv(['email_aluno,data_hora', 'joao@test.com,']);
      const result = await service.execute(file, 'checkins');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('data_hora');
    });

    it('should report error for invalid duration', async () => {
      const file = csv([
        'email_aluno,data_hora,duracao_min',
        'joao@test.com,15/03/2024 10:30,abc',
      ]);
      const result = await service.execute(file, 'checkins');
      expect(result.errors[0].field).toBe('duracao_min');
    });

    it('should report error for duration <= 0', async () => {
      const file = csv([
        'email_aluno,data_hora,duracao_min',
        'joao@test.com,15/03/2024 10:30,0',
      ]);
      const result = await service.execute(file, 'checkins');
      expect(result.errors[0].message).toBe('Duration must be > 0');
    });

    it('should parse date-only as midnight fallback', async () => {
      const file = csv(['email_aluno,data_hora', 'joao@test.com,15/03/2024']);
      const result = await service.execute(file, 'checkins');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]['ts']).toBeTruthy();
    });
  });

  // ── Payments ─────────────────────────────────────────────────
  describe('payments', () => {
    it('should parse valid payments CSV', async () => {
      const file = csv([
        'email_aluno,vencimento,valor,status',
        'joao@test.com,15/03/2024,99.90,pago',
        'maria@test.com,01/04/2024,150,pendente',
      ]);
      const result = await service.execute(file, 'payments');
      expect(result.totalRows).toBe(2);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toMatchObject({
        member_email: 'joao@test.com',
        amount: 99.9,
        status: 'paid',
      });
      expect(result.rows[1]).toMatchObject({
        status: 'pending',
      });
    });

    it('should handle Brazilian decimal separator (comma)', async () => {
      const file = csv([
        'email_aluno,vencimento,valor,status',
        'joao@test.com,15/03/2024,"99,90",pago',
      ]);
      const result = await service.execute(file, 'payments');
      expect(result.rows[0]['amount']).toBe(99.9);
    });

    it('should map PT-BR statuses to English', async () => {
      const file = csv([
        'email_aluno,vencimento,valor,status',
        'a@t.com,01/01/2024,100,atrasado',
        'b@t.com,01/01/2024,100,cancelado',
      ]);
      const result = await service.execute(file, 'payments');
      expect(result.rows[0]['status']).toBe('overdue');
      expect(result.rows[1]['status']).toBe('cancelled');
    });

    it('should default to pending when status is empty', async () => {
      const file = csv([
        'email_aluno,vencimento,valor,status',
        'joao@test.com,15/03/2024,100,',
      ]);
      const result = await service.execute(file, 'payments');
      expect(result.rows[0]['status']).toBe('pending');
    });

    it('should report error for invalid status', async () => {
      const file = csv([
        'email_aluno,vencimento,valor,status',
        'joao@test.com,15/03/2024,100,invalido',
      ]);
      const result = await service.execute(file, 'payments');
      expect(result.errors[0].field).toBe('status');
    });

    it('should report error for amount <= 0', async () => {
      const file = csv([
        'email_aluno,vencimento,valor,status',
        'joao@test.com,15/03/2024,-10,pago',
      ]);
      const result = await service.execute(file, 'payments');
      expect(result.errors[0].message).toBe('Amount must be > 0');
    });

    it('should report error for missing amount', async () => {
      const file = csv([
        'email_aluno,vencimento,valor,status',
        'joao@test.com,15/03/2024,,pago',
      ]);
      const result = await service.execute(file, 'payments');
      expect(result.errors[0].field).toBe('valor');
    });
  });

  // ── Column validation ────────────────────────────────────────
  describe('column validation', () => {
    it('should throw for missing required columns', async () => {
      const file = csv(['nome,telefone', 'João,11999']);
      await expect(service.execute(file, 'members')).rejects.toThrow(
        'Missing required columns',
      );
    });

    it('should throw for invalid entity type', async () => {
      const file = csv(['col1', 'val1']);
      await expect(service.execute(file, 'invalid' as any)).rejects.toThrow(
        'Invalid entity_type',
      );
    });
  });

  // ── Encoding ────────────────────────────────────────────────
  describe('encoding', () => {
    it('should handle UTF-8 BOM', async () => {
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      const content = Buffer.from(
        'nome,email,telefone,matricula_em\nJoão,joao@test.com,,15/03/2024',
      );
      const file = Buffer.concat([bom, content]);
      const result = await service.execute(file, 'members');
      expect(result.rows).toHaveLength(1);
    });
  });
});
