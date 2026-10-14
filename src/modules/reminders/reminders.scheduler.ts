import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RemindersService } from './reminders.service.js';

@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(private readonly remindersService: RemindersService) {}

  /**
   * Daily automated payment reminders cron job.
   * Runs every day at 09:00 AM server time.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleDailyRemindersCron(): Promise<void> {
    this.logger.log('Starting automated payment reminders daily cron schedule...');
    try {
      const summary = await this.remindersService.scanAndSendReminders();
      this.logger.log(
        `Automated daily reminder scan finished: ${summary.sent} sent, ${summary.skipped} skipped, ${summary.failed} failed.`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Automated daily reminder scan encountered an error: ${msg}`);
    }
  }
}
