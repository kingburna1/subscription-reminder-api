import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { BillingCycle } from '../enums/billing-cycle.enum.js';
import { SubscriptionStatus } from '../enums/subscription-status.enum.js';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Name of the subscription service',
    example: 'Netflix Premium',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Subscription price/amount (must be greater than 0)',
    example: 19.99,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Amount must be greater than 0' })
  amount!: number;

  @ApiProperty({
    description: 'Original billing start date (ISO date string YYYY-MM-DD)',
    example: '2026-01-15',
  })
  @IsDateString({}, { message: 'billingDate must be a valid ISO date string (YYYY-MM-DD)' })
  billingDate!: string;

  @ApiProperty({
    description: 'Recurring billing cycle',
    enum: BillingCycle,
    example: BillingCycle.MONTHLY,
  })
  @IsEnum(BillingCycle, { message: 'billingCycle must be either MONTHLY or YEARLY' })
  billingCycle!: BillingCycle;

  @ApiPropertyOptional({
    description: 'Subscription status (defaults to ACTIVE)',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus, { message: 'status must be either ACTIVE or CANCELLED' })
  status?: SubscriptionStatus;
}
