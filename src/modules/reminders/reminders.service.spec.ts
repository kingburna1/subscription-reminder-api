import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RemindersService } from './reminders.service.js';
import { ReminderStatus } from './enums/reminder-status.enum.js';
import { BillingCycle } from '../subscriptions/enums/billing-cycle.enum.js';
import { SubscriptionStatus } from '../subscriptions/enums/subscription-status.enum.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ReminderHistory } from './entities/reminder-history.entity.js';
import { Subscription } from '../subscriptions/entities/subscription.entity.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { MailService } from '../mail/mail.service.js';
import { User } from '../users/entities/user.entity.js';

describe('RemindersService', () => {
  let service: RemindersService;
  let reminderRepo: Partial<Repository<ReminderHistory>>;
  let subscriptionRepo: Partial<Repository<Subscription>>;
  let subscriptionsService: Partial<SubscriptionsService>;
  let mailService: Partial<MailService>;

  const mockUser: User = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    subscriptions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubscriptionDueIn2Days: Subscription = {
    id: 'sub-uuid-1',
    name: 'Netflix Premium',
    amount: 19.99,
    billingDate: new Date('2026-09-16'),
    billingCycle: BillingCycle.MONTHLY,
    status: SubscriptionStatus.ACTIVE,
    userId: 'user-uuid-1',
    user: mockUser,
    reminders: [],
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
  };

  const mockSubscriptionDueIn10Days: Subscription = {
    id: 'sub-uuid-2',
    name: 'Amazon Prime',
    amount: 14.99,
    billingDate: new Date('2026-09-24'),
    billingCycle: BillingCycle.MONTHLY,
    status: SubscriptionStatus.ACTIVE,
    userId: 'user-uuid-1',
    user: mockUser,
    reminders: [],
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-01'),
  };

  const baseReferenceDate = new Date('2026-10-14T08:00:00Z');

  beforeEach(() => {
    // Setup repository mocks
    reminderRepo = {
      create: vi.fn().mockImplementation((dto) => ({
        ...dto,
        id: 'reminder-uuid-new',
        sentAt: new Date(),
      })),
      save: vi.fn().mockImplementation((item) => Promise.resolve(item)),
      find: vi.fn().mockResolvedValue([]),
      createQueryBuilder: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        innerJoinAndSelect: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null), // No duplicate by default
        getMany: vi.fn().mockResolvedValue([]),
      }),
    };

    subscriptionRepo = {
      find: vi.fn().mockResolvedValue([mockSubscriptionDueIn2Days]),
      findOne: vi.fn().mockResolvedValue(mockSubscriptionDueIn2Days),
    };

    subscriptionsService = {
      calculateNextBillingDate: vi
        .fn()
        .mockImplementation((billingDate, _cycle, _refDate) => {
          // If sub-uuid-1 -> 2026-10-16 (due in 2 days from 2026-10-14)
          // If sub-uuid-2 -> 2026-10-24 (due in 10 days from 2026-10-14)
          if (String(billingDate).includes('16')) return '2026-10-16';
          if (String(billingDate).includes('24')) return '2026-10-24';
          return '2026-10-14';
        }),
    };

    mailService = {
      sendReminderEmail: vi.fn().mockResolvedValue(true),
    };

    service = new RemindersService(
      reminderRepo as Repository<ReminderHistory>,
      subscriptionRepo as Repository<Subscription>,
      subscriptionsService as SubscriptionsService,
      mailService as MailService,
    );
  });

  describe('scanAndSendReminders', () => {
    it('should dispatch a reminder and record SUCCESS when a subscription is due in 2 days (within 3-day window)', async () => {
      const result = await service.scanAndSendReminders(baseReferenceDate);

      expect(result.scanned).toBe(1);
      expect(result.eligible).toBe(1);
      expect(result.sent).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);

      expect(mailService.sendReminderEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subscriptionName: 'Netflix Premium',
        amount: 19.99,
        billingDate: '2026-10-16',
      });

      expect(reminderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: 'sub-uuid-1',
          status: ReminderStatus.SUCCESS,
        }),
      );
      expect(reminderRepo.save).toHaveBeenCalled();
    });

    it('should not dispatch a reminder if next billing date is beyond 3 days', async () => {
      vi.mocked(subscriptionRepo.find!).mockResolvedValue([
        mockSubscriptionDueIn10Days,
      ]);

      const result = await service.scanAndSendReminders(baseReferenceDate);

      expect(result.scanned).toBe(1);
      expect(result.eligible).toBe(0);
      expect(result.sent).toBe(0);
      expect(mailService.sendReminderEmail).not.toHaveBeenCalled();
      expect(reminderRepo.save).not.toHaveBeenCalled();
    });

    it('should prevent duplicates and skip sending if reminder history already exists for this cycle', async () => {
      // Mock an existing reminder
      vi.mocked(reminderRepo.createQueryBuilder!).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        innerJoinAndSelect: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({
          id: 'existing-reminder-uuid',
          subscriptionId: 'sub-uuid-1',
          targetBillingDate: '2026-10-16',
          status: ReminderStatus.SUCCESS,
        }),
        getMany: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await service.scanAndSendReminders(baseReferenceDate);

      expect(result.scanned).toBe(1);
      expect(result.eligible).toBe(1);
      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.failed).toBe(0);

      expect(mailService.sendReminderEmail).not.toHaveBeenCalled();
      expect(reminderRepo.save).not.toHaveBeenCalled();
      expect(result.results[0].status).toBe('SKIPPED');
    });

    it('should record FAILED status with error message if mail delivery throws an exception (fail-safe)', async () => {
      vi.mocked(mailService.sendReminderEmail!).mockRejectedValue(
        new Error('SMTP gateway connection refused'),
      );

      const result = await service.scanAndSendReminders(baseReferenceDate);

      expect(result.scanned).toBe(1);
      expect(result.eligible).toBe(1);
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);

      expect(reminderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: 'sub-uuid-1',
          status: ReminderStatus.FAILED,
          errorMessage: 'SMTP gateway connection refused',
        }),
      );
      expect(reminderRepo.save).toHaveBeenCalled();
      expect(result.results[0].status).toBe('FAILED');
    });
  });

  describe('findHistoryForSubscription', () => {
    it('should return reminders for an existing subscription owned by user', async () => {
      const mockHistoryItem: ReminderHistory = {
        id: 'hist-1',
        subscriptionId: 'sub-uuid-1',
        targetBillingDate: new Date('2026-10-16'),
        status: ReminderStatus.SUCCESS,
        sentAt: new Date('2026-10-14T09:00:00Z'),
        subscription: mockSubscriptionDueIn2Days,
      };

      vi.mocked(reminderRepo.find!).mockResolvedValue([mockHistoryItem]);

      const history = await service.findHistoryForSubscription(
        'user-uuid-1',
        'sub-uuid-1',
      );

      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('hist-1');
      expect(history[0].subscriptionName).toBe('Netflix Premium');
      expect(history[0].targetBillingDate).toBe('2026-10-16');
      expect(history[0].status).toBe(ReminderStatus.SUCCESS);
    });

    it('should throw NotFoundException if subscription does not exist', async () => {
      vi.mocked(subscriptionRepo.findOne!).mockResolvedValue(null);

      await expect(
        service.findHistoryForSubscription('user-uuid-1', 'non-existent-sub'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if subscription belongs to another user', async () => {
      vi.mocked(subscriptionRepo.findOne!).mockResolvedValue({
        ...mockSubscriptionDueIn2Days,
        userId: 'other-user-uuid',
      });

      await expect(
        service.findHistoryForSubscription('user-uuid-1', 'sub-uuid-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAllForUser', () => {
    it('should return all reminders for user subscriptions', async () => {
      const mockHistoryItem: ReminderHistory = {
        id: 'hist-user-1',
        subscriptionId: 'sub-uuid-1',
        targetBillingDate: new Date('2026-10-16'),
        status: ReminderStatus.SUCCESS,
        sentAt: new Date('2026-10-14T09:00:00Z'),
        subscription: mockSubscriptionDueIn2Days,
      };

      vi.mocked(reminderRepo.createQueryBuilder!).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        innerJoinAndSelect: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
        getMany: vi.fn().mockResolvedValue([mockHistoryItem]),
      } as any);

      const history = await service.findAllForUser('user-uuid-1');

      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('hist-user-1');
      expect(history[0].subscriptionName).toBe('Netflix Premium');
    });
  });
});
