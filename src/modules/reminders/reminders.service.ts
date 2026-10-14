import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReminderHistory } from './entities/reminder-history.entity.js';
import { Subscription } from '../subscriptions/entities/subscription.entity.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { MailService } from '../mail/mail.service.js';
import { ReminderStatus } from './enums/reminder-status.enum.js';
import { SubscriptionStatus } from '../subscriptions/enums/subscription-status.enum.js';
import { ReminderResponseDto } from './dto/reminder-response.dto.js';
import {
  TriggerScanResponseDto,
  ReminderScanResultItem,
} from './dto/trigger-scan-response.dto.js';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectRepository(ReminderHistory)
    private readonly reminderHistoryRepository: Repository<ReminderHistory>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Part 2, Exercise 2: Automated Payment Reminders Scanner
   *
   * Scans active subscriptions whose next billing date is within the next 3 days:
   * (today <= nextBillingDate <= today + 3 days).
   *
   * Enforces zero duplicates: checks ReminderHistory for (subscriptionId, targetBillingDate).
   * Attempts delivery (with fallback / logging) and records result as SUCCESS or FAILED.
   *
   * @param referenceDate Optional baseline date (defaults to current system date)
   */
  async scanAndSendReminders(
    referenceDate?: Date,
  ): Promise<TriggerScanResponseDto> {
    const ref = referenceDate ? new Date(referenceDate) : new Date();
    const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 3);

    const todayStr = this.formatDate(today);
    const maxDateStr = this.formatDate(maxDate);

    this.logger.log(
      `[CRON SCAN STARTED] Window: ${todayStr} to ${maxDateStr} (inclusive)`,
    );

    // Fetch all active subscriptions including owner details for email dispatch
    const subscriptions = await this.subscriptionRepository.find({
      where: { status: SubscriptionStatus.ACTIVE },
      relations: { user: true },
    });

    let eligible = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const results: ReminderScanResultItem[] = [];

    for (const sub of subscriptions) {
      // Calculate dynamic next renewal date
      const nextBillingDateStr =
        this.subscriptionsService.calculateNextBillingDate(
          sub.billingDate,
          sub.billingCycle,
          today,
        );

      // Check if next billing date falls within the [today, today + 3 days] window
      const isEligible =
        nextBillingDateStr >= todayStr && nextBillingDateStr <= maxDateStr;

      if (!isEligible) {
        continue;
      }

      eligible++;

      // Duplicate Prevention: Check if reminder was already logged for this cycle
      const existing = await this.reminderHistoryRepository
        .createQueryBuilder('reminder')
        .where('reminder.subscriptionId = :subId', { subId: sub.id })
        .andWhere('reminder.targetBillingDate = :targetDate', {
          targetDate: nextBillingDateStr,
        })
        .getOne();

      if (existing) {
        skipped++;
        this.logger.log(
          `[REMINDER SKIP] Duplicate prevented: Subscription "${sub.name}" (${sub.id}) already has a reminder for ${nextBillingDateStr}`,
        );
        results.push({
          subscriptionId: sub.id,
          subscriptionName: sub.name,
          targetBillingDate: nextBillingDateStr,
          status: 'SKIPPED',
          recipientEmail: sub.user?.email,
          reason: 'Reminder already exists for this billing date',
        });
        continue;
      }

      // Prepare dispatch
      const recipientEmail = sub.user?.email || 'user@example.com';
      let status = ReminderStatus.SUCCESS;
      let errorMessage: string | undefined = undefined;

      try {
        await this.mailService.sendReminderEmail({
          to: recipientEmail,
          subscriptionName: sub.name,
          amount: Number(sub.amount),
          billingDate: nextBillingDateStr,
        });
        sent++;
        this.logger.log(
          `[REMINDER SUCCESS] Sent reminder to ${recipientEmail} for "${sub.name}" (Due: ${nextBillingDateStr})`,
        );
      } catch (err: unknown) {
        status = ReminderStatus.FAILED;
        errorMessage = err instanceof Error ? err.message : String(err);
        failed++;
        this.logger.error(
          `[REMINDER FAILED] Could not send reminder for subscription ${sub.id}: ${errorMessage}`,
        );
      }

      // Record result in reminder_history table (fail-safe audit log)
      const [year, month, day] = nextBillingDateStr.split('-').map(Number);
      const targetDateObj = new Date(Date.UTC(year, month - 1, day));

      const historyEntry = this.reminderHistoryRepository.create({
        subscriptionId: sub.id,
        targetBillingDate: targetDateObj,
        status,
        sentAt: new Date(),
        errorMessage,
      });

      await this.reminderHistoryRepository.save(historyEntry);

      results.push({
        subscriptionId: sub.id,
        subscriptionName: sub.name,
        targetBillingDate: nextBillingDateStr,
        status: status === ReminderStatus.SUCCESS ? 'SUCCESS' : 'FAILED',
        recipientEmail,
        reason: errorMessage,
      });
    }

    const summary: TriggerScanResponseDto = {
      message: 'Payment reminder scan triggered successfully',
      scanned: subscriptions.length,
      eligible,
      sent,
      skipped,
      failed,
      results,
    };

    this.logger.log(
      `[CRON SCAN FINISHED] Scanned: ${summary.scanned}, Eligible: ${summary.eligible}, Sent: ${summary.sent}, Skipped: ${summary.skipped}, Failed: ${summary.failed}`,
    );

    return summary;
  }

  /**
   * Retrieves all reminder history for subscriptions belonging to the user.
   */
  async findAllForUser(userId: string): Promise<ReminderResponseDto[]> {
    const history = await this.reminderHistoryRepository
      .createQueryBuilder('reminder')
      .innerJoinAndSelect('reminder.subscription', 'subscription')
      .where('subscription.userId = :userId', { userId })
      .orderBy('reminder.sentAt', 'DESC')
      .getMany();

    return history.map((item) =>
      this.mapToResponse(item, item.subscription?.name),
    );
  }

  /**
   * Retrieves reminder history for a single subscription, enforcing user ownership.
   */
  async findHistoryForSubscription(
    userId: string,
    subscriptionId: string,
  ): Promise<ReminderResponseDto[]> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription with ID "${subscriptionId}" not found`,
      );
    }

    if (subscription.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this subscription',
      );
    }

    const history = await this.reminderHistoryRepository.find({
      where: { subscriptionId },
      order: { sentAt: 'DESC' },
    });

    return history.map((item) =>
      this.mapToResponse(item, subscription.name),
    );
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private mapToResponse(
    item: ReminderHistory,
    subscriptionName?: string,
  ): ReminderResponseDto {
    let dateStr: string;
    if (item.targetBillingDate instanceof Date) {
      dateStr = item.targetBillingDate.toISOString().split('T')[0];
    } else {
      dateStr = String(item.targetBillingDate).split('T')[0];
    }

    return {
      id: item.id,
      subscriptionId: item.subscriptionId,
      subscriptionName,
      targetBillingDate: dateStr,
      status: item.status,
      sentAt: item.sentAt,
      errorMessage: item.errorMessage ?? undefined,
    };
  }
}
