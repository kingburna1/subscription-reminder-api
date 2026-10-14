import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionsService } from './subscriptions.service.js';
import { BillingCycle } from './enums/billing-cycle.enum.js';
import { SubscriptionStatus } from './enums/subscription-status.enum.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity.js';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let repo: Partial<Repository<Subscription>>;

  const mockSubscription: Subscription = {
    id: 'sub-uuid-1',
    name: 'Spotify Family',
    amount: 15.99,
    billingDate: new Date('2026-01-10'),
    billingCycle: BillingCycle.MONTHLY,
    status: SubscriptionStatus.ACTIVE,
    userId: 'user-uuid-1',
    reminders: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    repo = {
      create: vi.fn().mockImplementation((dto) => ({
        ...dto,
        id: 'new-sub-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      save: vi.fn().mockImplementation((sub) => Promise.resolve(sub)),
      find: vi.fn().mockResolvedValue([mockSubscription]),
      findOne: vi.fn().mockResolvedValue(mockSubscription),
      remove: vi.fn().mockResolvedValue(mockSubscription),
    };

    service = new SubscriptionsService(repo as Repository<Subscription>);
  });

  describe('calculateNextBillingDate', () => {
    const fixedReference = new Date('2026-10-14T12:00:00Z');

    it('should return original date if it is in the future', () => {
      const nextDate = service.calculateNextBillingDate(
        '2026-12-01',
        BillingCycle.MONTHLY,
        fixedReference,
      );
      expect(nextDate).toBe('2026-12-01');
    });

    it('should return original date if it is today', () => {
      const nextDate = service.calculateNextBillingDate(
        '2026-10-14',
        BillingCycle.MONTHLY,
        fixedReference,
      );
      expect(nextDate).toBe('2026-10-14');
    });

    it('should forward monthly renewal to next upcoming cycle when in the past', () => {
      const nextDate = service.calculateNextBillingDate(
        '2026-08-20',
        BillingCycle.MONTHLY,
        fixedReference,
      );
      expect(nextDate).toBe('2026-10-20');
    });

    it('should forward monthly renewal to next month if past current month cycle day', () => {
      const nextDate = service.calculateNextBillingDate(
        '2026-08-10',
        BillingCycle.MONTHLY,
        fixedReference,
      );
      expect(nextDate).toBe('2026-11-10');
    });

    it('should clamp days in shorter months (e.g. Jan 31 -> Feb 28 in non-leap year)', () => {
      const febRef = new Date('2026-02-15');
      const nextDate = service.calculateNextBillingDate(
        '2026-01-31',
        BillingCycle.MONTHLY,
        febRef,
      );
      expect(nextDate).toBe('2026-02-28');
    });

    it('should calculate next yearly billing date upcoming later this year', () => {
      const nextDate = service.calculateNextBillingDate(
        '2024-11-25',
        BillingCycle.YEARLY,
        fixedReference,
      );
      expect(nextDate).toBe('2026-11-25');
    });

    it('should calculate next yearly billing date for cycle already passed this year', () => {
      const nextDate = service.calculateNextBillingDate(
        '2024-05-10',
        BillingCycle.YEARLY,
        fixedReference,
      );
      expect(nextDate).toBe('2027-05-10');
    });

    it('should handle leap year Feb 29 advancing to non-leap year Feb 28', () => {
      const ref2025 = new Date('2025-01-01');
      const nextDate = service.calculateNextBillingDate(
        '2024-02-29',
        BillingCycle.YEARLY,
        ref2025,
      );
      expect(nextDate).toBe('2025-02-28');
    });
  });

  describe('CRUD operations', () => {
    it('should create subscription and calculate nextBillingDate', async () => {
      const result = await service.create('user-uuid-1', {
        name: 'GitHub Copilot',
        amount: 10,
        billingDate: '2026-01-05',
        billingCycle: BillingCycle.MONTHLY,
      });

      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(result.name).toBe('GitHub Copilot');
      expect(result.amount).toBe(10);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.nextBillingDate).toBeDefined();
    });

    it('should find all subscriptions belonging to user', async () => {
      const results = await service.findAll('user-uuid-1', {});
      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        order: { createdAt: 'DESC' },
      });
      expect(results.length).toBe(1);
      expect(results[0].nextBillingDate).toBeDefined();
    });

    it('should filter subscriptions by status when provided', async () => {
      await service.findAll('user-uuid-1', { status: SubscriptionStatus.ACTIVE });
      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1', status: SubscriptionStatus.ACTIVE },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return subscription by id when owned by user', async () => {
      const result = await service.findOne('user-uuid-1', 'sub-uuid-1');
      expect(result.id).toBe('sub-uuid-1');
      expect(result.userId).toBe('user-uuid-1');
    });

    it('should throw NotFoundException when subscription does not exist', async () => {
      vi.mocked(repo.findOne)!.mockResolvedValueOnce(null);
      await expect(service.findOne('user-uuid-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when subscription belongs to another user', async () => {
      await expect(service.findOne('other-user-uuid', 'sub-uuid-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should update subscription fields when owned by user', async () => {
      const result = await service.update('user-uuid-1', 'sub-uuid-1', {
        name: 'Spotify Duo',
        amount: 12.99,
      });

      expect(repo.save).toHaveBeenCalled();
      expect(result.name).toBe('Spotify Duo');
      expect(result.amount).toBe(12.99);
    });

    it('should delete subscription when owned by user', async () => {
      const result = await service.remove('user-uuid-1', 'sub-uuid-1');
      expect(repo.remove).toHaveBeenCalled();
      expect(result.message).toContain('deleted');
      expect(result.id).toBe('sub-uuid-1');
    });
  });
});
