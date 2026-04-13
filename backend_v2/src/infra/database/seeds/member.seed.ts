import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { faker } from '@faker-js/faker/locale/pt_BR';
import { ISeed, SeedResult } from './seed.interface';
import { GymEntity } from '../entities/gym.entity';
import { MemberEntity } from '../entities/member.entity';
import { CheckinEntity } from '../entities/checkin.entity';
import { PaymentEntity } from '../entities/payment.entity';

const PLAN_PRICES = [99.9, 129.9, 149.9, 179.9, 199.9, 249.9];
const DUE_DAYS = [1, 5, 10];
const BATCH_SIZE = 500;

@Injectable()
export class MemberSeed implements ISeed {
  readonly name = 'MemberSeed';
  readonly order = 40;

  private readonly logger = new Logger(MemberSeed.name);

  constructor(
    @InjectRepository(GymEntity)
    private readonly gymRepo: Repository<GymEntity>,
    @InjectRepository(MemberEntity)
    private readonly memberRepo: Repository<MemberEntity>,
    @InjectRepository(CheckinEntity)
    private readonly checkinRepo: Repository<CheckinEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
  ) {}

  async run(): Promise<SeedResult> {
    faker.seed(42);

    const gyms = await this.gymRepo.find();
    if (gyms.length === 0) {
      this.logger.warn('No gyms found — run GymSeed first');
      return { created: 0, skipped: 0, updated: 0, errors: [] };
    }

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const gym of gyms) {
      const existing = await this.memberRepo.count({
        where: { gymId: gym.id },
      });

      if (existing > 0) {
        this.logger.log(`  Skipped ${gym.name} — already has ${existing} members`);
        totalSkipped += existing;
        continue;
      }

      const memberCount = faker.number.int({ min: 30, max: 80 });
      const members = Array.from({ length: memberCount }, () =>
        this.buildMember(gym.id),
      );

      const saved = await this.bulkInsert(this.memberRepo, members);
      this.logger.log(`  ${gym.name}: ${saved.length} members created`);

      const allCheckins: Partial<CheckinEntity>[] = [];
      const allPayments: Partial<PaymentEntity>[] = [];

      for (const member of saved) {
        const checkins = this.buildCheckins(member, gym.id);
        const payments = this.buildPayments(member, gym.id);
        allCheckins.push(...checkins);
        allPayments.push(...payments);
      }

      await this.bulkInsert(this.checkinRepo, allCheckins);
      await this.bulkInsert(this.paymentRepo, allPayments);

      this.logger.log(
        `  ${gym.name}: ${allCheckins.length} checkins, ${allPayments.length} payments`,
      );

      totalCreated += saved.length;
    }

    this.logger.log(
      `Summary — ${totalCreated} members created, ${totalSkipped} skipped`,
    );

    return {
      created: totalCreated,
      skipped: totalSkipped,
      updated: 0,
      errors: [],
    };
  }

  private buildMember(gymId: string): Partial<MemberEntity> {
    const roll = faker.number.float({ min: 0, max: 1 });
    const status = roll < 0.7 ? 'active' : roll < 0.85 ? 'inactive' : 'cancelled';

    const enrolledAt = faker.date.between({
      from: new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000),
      to: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    let cancelledAt: Date | null = null;
    if (status === 'cancelled') {
      cancelledAt = faker.date.between({
        from: enrolledAt,
        to: new Date(),
      });
    }

    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      gymId,
      name: `${firstName} ${lastName}`,
      email: faker.number.float({ min: 0, max: 1 }) < 0.9
        ? faker.internet.email({ firstName, lastName }).toLowerCase()
        : null,
      phone: faker.number.float({ min: 0, max: 1 }) < 0.85
        ? faker.phone.number({ style: 'national' })
        : null,
      enrolledAt,
      cancelledAt,
      status,
    };
  }

  private buildCheckins(
    member: MemberEntity,
    gymId: string,
  ): Partial<CheckinEntity>[] {
    const checkins: Partial<CheckinEntity>[] = [];
    const now = new Date();

    let startDate: Date;
    let endDate: Date;
    let weeklyFreq: number;

    const enrolled = new Date(member.enrolledAt);
    const cancelled = member.cancelledAt ? new Date(member.cancelledAt) : null;

    if (member.status === 'active') {
      startDate = new Date(
        Math.max(enrolled.getTime(), now.getTime() - 90 * 24 * 60 * 60 * 1000),
      );
      endDate = now;
      weeklyFreq = faker.number.int({ min: 3, max: 5 });
    } else if (member.status === 'inactive') {
      startDate = new Date(
        Math.max(enrolled.getTime(), now.getTime() - 120 * 24 * 60 * 60 * 1000),
      );
      endDate = new Date(
        now.getTime() -
          faker.number.int({ min: 30, max: 60 }) * 24 * 60 * 60 * 1000,
      );
      weeklyFreq = faker.number.int({ min: 2, max: 4 });
    } else {
      startDate = enrolled;
      endDate = cancelled ?? now;
      weeklyFreq = faker.number.int({ min: 1, max: 4 });
    }

    if (startDate >= endDate) return checkins;

    const totalDays = Math.floor(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    const totalCheckins = Math.floor((totalDays / 7) * weeklyFreq);

    for (let i = 0; i < totalCheckins; i++) {
      const day = faker.date.between({ from: startDate, to: endDate });

      // 80% weekdays, 20% weekends
      if (day.getDay() === 0 || day.getDay() === 6) {
        if (faker.number.float({ min: 0, max: 1 }) > 0.2) continue;
      }

      // Bimodal hours: morning (6-9) or evening (17-21)
      const isMorning = faker.number.float({ min: 0, max: 1 }) < 0.4;
      const hour = isMorning
        ? faker.number.int({ min: 6, max: 9 })
        : faker.number.int({ min: 17, max: 21 });
      const minute = faker.number.int({ min: 0, max: 59 });
      day.setHours(hour, minute, 0, 0);

      checkins.push({
        memberId: member.id,
        gymId,
        ts: day,
        durationMin:
          faker.number.float({ min: 0, max: 1 }) < 0.9
            ? faker.number.int({ min: 30, max: 120 })
            : null,
      });
    }

    return checkins;
  }

  private buildPayments(
    member: MemberEntity,
    gymId: string,
  ): Partial<PaymentEntity>[] {
    const payments: Partial<PaymentEntity>[] = [];
    const now = new Date();
    const price = faker.helpers.arrayElement(PLAN_PRICES);
    const dueDay = faker.helpers.arrayElement(DUE_DAYS);

    const enrolled = new Date(member.enrolledAt);
    const cancelled = member.cancelledAt ? new Date(member.cancelledAt) : null;

    const endDate =
      member.status === 'cancelled' && cancelled ? cancelled : now;

    const cursor = new Date(enrolled);
    cursor.setDate(dueDay);
    if (cursor < enrolled) {
      cursor.setMonth(cursor.getMonth() + 1);
    }

    let monthIndex = 0;
    const totalMonths = this.monthsBetween(cursor, endDate);

    while (cursor <= endDate) {
      const dueDate = new Date(cursor);
      const isLastMonth = monthIndex === totalMonths;
      const isCurrentMonth =
        cursor.getFullYear() === now.getFullYear() &&
        cursor.getMonth() === now.getMonth();

      let status: string;
      let paidAt: Date | null = null;

      if (member.status === 'active') {
        if (isCurrentMonth) {
          status = 'pending';
        } else if (faker.number.float({ min: 0, max: 1 }) < 0.05) {
          status = 'overdue';
        } else {
          status = 'paid';
          paidAt = new Date(dueDate);
          paidAt.setDate(paidAt.getDate() + faker.number.int({ min: 0, max: 5 }));
        }
      } else if (member.status === 'inactive') {
        const monthsFromEnd = totalMonths - monthIndex;
        if (monthsFromEnd <= 2) {
          status = 'overdue';
        } else {
          status = 'paid';
          paidAt = new Date(dueDate);
          paidAt.setDate(paidAt.getDate() + faker.number.int({ min: 0, max: 5 }));
        }
      } else {
        // cancelled
        if (isLastMonth) {
          status = 'cancelled';
        } else {
          status = 'paid';
          paidAt = new Date(dueDate);
          paidAt.setDate(paidAt.getDate() + faker.number.int({ min: 0, max: 5 }));
        }
      }

      payments.push({
        memberId: member.id,
        gymId,
        dueDate,
        paidAt,
        amount: price,
        status,
      });

      cursor.setMonth(cursor.getMonth() + 1);
      monthIndex++;
    }

    return payments;
  }

  private monthsBetween(from: Date, to: Date): number {
    return (
      (to.getFullYear() - from.getFullYear()) * 12 +
      (to.getMonth() - from.getMonth())
    );
  }

  private async bulkInsert<T extends object>(
    repo: Repository<T>,
    records: Partial<T>[],
  ): Promise<T[]> {
    if (records.length === 0) return [];

    const results: T[] = [];
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const saved = await repo.save(batch as T[]);
      results.push(...saved);
    }
    return results;
  }
}
