import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Request } from 'express';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ClerkAuthGuard } from '../../../infra/auth/clerk-auth.guard';
import { ActionRepository } from '../../../data/protocols/action-repository';
import { ActionChannel } from '../../../domain/enums';
import { PaginationQuery } from '../../../shared/pagination.dto';

class ListActionsRequest extends PaginationQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  member_id?: string;
}

class CreateActionRequest {
  @ApiProperty()
  @IsUUID()
  member_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  action_type: string;

  @ApiProperty({ enum: ActionChannel })
  @IsEnum(ActionChannel)
  channel: ActionChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}

@ApiTags('Actions')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('actions')
export class ActionsController {
  constructor(private readonly actionRepo: ActionRepository) {}

  @Get()
  @ApiOperation({ summary: 'List retention actions' })
  @ApiResponse({ status: 200, description: 'Paginated actions' })
  async list(@Req() req: Request, @Query() query: ListActionsRequest) {
    const gymId = (req as any).gymUuid;
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 20;

    const { actions, total } = await this.actionRepo.findByGym(gymId, {
      memberId: query.member_id,
      page,
      pageSize,
    });

    return { actions, total, page, page_size: pageSize };
  }

  @Post()
  @ApiOperation({ summary: 'Create a retention action' })
  @ApiResponse({ status: 201, description: 'Action created' })
  async create(@Req() req: Request, @Body() body: CreateActionRequest) {
    const gymId = (req as any).gymUuid;

    const action = await this.actionRepo.create({
      gymId,
      memberId: body.member_id,
      actionType: body.action_type,
      channel: body.channel,
      message: body.message,
    });

    return action;
  }
}
