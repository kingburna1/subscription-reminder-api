import { ApiProperty } from '@nestjs/swagger';
import { BillingCycle } from '../enums/billing-cycle.enum.js';
import { SubscriptionStatus } from '../enums/subscription-status.enum.js';

export class SubscriptionResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'Netflix Premium' })
  name!: string;

  @ApiProperty({ example: 19.99 })
  amount!: number;

  @ApiProperty({ example: '2026-01-15' })
  billingDate!: string;

  @ApiProperty({ enum: BillingCycle, example: BillingCycle.MONTHLY })
  billingCycle!: BillingCycle;

  @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE })
  status!: SubscriptionStatus;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  userId!: string;

  @ApiProperty({
    description: 'Dynamically calculated upcoming renewal / next billing date',
    example: '2026-11-15',
  })
  nextBillingDate!: string;

  @ApiProperty({ example: '2026-10-14T16:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-10-14T16:00:00.000Z' })
  updatedAt!: Date;
}
