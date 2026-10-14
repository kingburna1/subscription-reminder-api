import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { SubscriptionStatus } from '../enums/subscription-status.enum.js';

export class QuerySubscriptionDto {
  @ApiPropertyOptional({
    description: 'Filter subscriptions by status',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus, { message: 'status must be either ACTIVE or CANCELLED' })
  status?: SubscriptionStatus;
}
