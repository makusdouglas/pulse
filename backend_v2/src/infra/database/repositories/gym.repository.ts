import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GymRepository } from '../../../data/protocols/gym-repository';
import { Gym } from '../../../domain/entities';
import { GymEntity } from '../entities/gym.entity';

@Injectable()
export class GymPostgresRepository implements GymRepository {
  constructor(
    @InjectRepository(GymEntity)
    private readonly repo: Repository<GymEntity>,
  ) {}

  async findById(gymId: string): Promise<Gym | null> {
    const entity = await this.repo.findOne({ where: { id: gymId } });
    return entity ? this.toGym(entity) : null;
  }

  async findAllIds(): Promise<string[]> {
    const gyms = await this.repo.find({ select: ['id'] });
    return gyms.map((g) => g.id);
  }

  async update(gymId: string, data: Partial<Gym>): Promise<Gym> {
    await this.repo.update(gymId, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
    });
    const entity = await this.repo.findOneOrFail({ where: { id: gymId } });
    return this.toGym(entity);
  }

  private toGym(e: GymEntity): Gym {
    return {
      id: e.id,
      name: e.name,
      slug: e.slug,
      email: e.email,
      phone: e.phone,
      clerkOrgId: e.clerkOrgId,
      timezone: e.timezone,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }
}
