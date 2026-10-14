import { ApiProperty } from '@nestjs/swagger';

export class ReminderScanResultItem {
  @ApiProperty({ example: 'd3b07384-d113-4f44-9344-59a6d0921447' })
  subscriptionId: string;

  @ApiProperty({ example: 'Netflix Premium' })
  subscriptionName: string;

  @ApiProperty({ example: '2026-10-17' })
  targetBillingDate: string;

  @ApiProperty({ example: 'SUCCESS', enum: ['SUCCESS', 'FAILED', 'SKIPPED'] })
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';

  @ApiProperty({ example: 'john.doe@example.com', required: false })
  recipientEmail?: string;

  @ApiProperty({ example: 'Already sent reminder for this cycle', required: false })
  reason?: string;
}

export class TriggerScanResponseDto {
  @ApiProperty({
    example: 'Payment reminder scan triggered successfully',
    description: 'Human-readable summary message',
  })
  message: string;

  @ApiProperty({
    example: 10,
    description: 'Total number of active subscriptions scanned',
  })
  scanned: number;

  @ApiProperty({
    example: 3,
    description: 'Number of subscriptions due within the next 3 days',
  })
  eligible: number;

  @ApiProperty({
    example: 2,
    description: 'Number of reminders successfully dispatched',
  })
  sent: number;

  @ApiProperty({
    example: 1,
    description: 'Number of eligible subscriptions skipped due to duplicate prevention',
  })
  skipped: number;

  @ApiProperty({
    example: 0,
    description: 'Number of failed dispatches',
  })
  failed: number;

  @ApiProperty({
    type: [ReminderScanResultItem],
    description: 'Breakdown of actions taken for each eligible subscription',
  })
  results: ReminderScanResultItem[];
}
