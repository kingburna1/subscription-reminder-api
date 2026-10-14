import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderStatus } from '../enums/reminder-status.enum.js';

export class ReminderResponseDto {
  @ApiProperty({
    example: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    description: 'Unique identifier for the reminder record',
  })
  id: string;

  @ApiProperty({
    example: 'd3b07384-d113-4f44-9344-59a6d0921447',
    description: 'Associated subscription UUID',
  })
  subscriptionId: string;

  @ApiPropertyOptional({
    example: 'Netflix Premium',
    description: 'Name of the subscription (if populated)',
  })
  subscriptionName?: string;

  @ApiProperty({
    example: '2026-10-17',
    description: 'Target billing date for which this reminder was sent (YYYY-MM-DD)',
  })
  targetBillingDate: string;

  @ApiProperty({
    enum: ReminderStatus,
    example: ReminderStatus.SUCCESS,
    description: 'Status of the reminder dispatch',
  })
  status: ReminderStatus;

  @ApiProperty({
    example: '2026-10-14T14:30:00.000Z',
    description: 'Timestamp when the reminder dispatch was executed',
  })
  sentAt: Date;

  @ApiPropertyOptional({
    example: 'Connection timeout with mail server',
    description: 'Error message if the dispatch failed',
  })
  errorMessage?: string;
}
