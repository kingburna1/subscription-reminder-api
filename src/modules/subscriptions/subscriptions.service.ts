import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity.js';
import { CreateSubscriptionDto } from './dto/create-subscription.dto.js';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto.js';
import { QuerySubscriptionDto } from './dto/query-subscription.dto.js';
import { SubscriptionResponseDto } from './dto/subscription-response.dto.js';
import { BillingCycle } from './enums/billing-cycle.enum.js';
import { SubscriptionStatus } from './enums/subscription-status.enum.js';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  /**
   * Part 2, Exercise 1: Next Billing Date Calculator
   *
   * Automatically increments forward by month or year until finding the next upcoming renewal date.
   * Handles edge cases like varying month lengths (Jan 31 -> Feb 28) and leap years.
   *
   * @param billingDate - Original start/billing date (Date object or YYYY-MM-DD string)
   * @param billingCycle - BillingCycle enum (MONTHLY or YEARLY)
   * @param referenceDate - Baseline date to compare against (defaults to current date)
   * @returns Formatted ISO date string (YYYY-MM-DD) representing the next billing date
   */
  calculateNextBillingDate(
    billingDate: Date | string,
    billingCycle: BillingCycle,
    referenceDate: Date = new Date(),
  ): string {
    const start = this.parseDate(billingDate);
    const ref = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate(),
    );

    if (start >= ref) {
      return this.formatDate(start);
    }

    let next = new Date(start);
    let step = 1;

    while (next < ref) {
      if (billingCycle === BillingCycle.MONTHLY) {
        next = this.addMonths(start, step);
      } else if (billingCycle === BillingCycle.YEARLY) {
        next = this.addYears(start, step);
      } else {
        break;
      }
      step++;
    }

    return this.formatDate(next);
  }

  async create(
    userId: string,
    createDto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    const subscription = this.subscriptionRepository.create({
      name: createDto.name,
      amount: createDto.amount,
      billingDate: this.parseDate(createDto.billingDate),
      billingCycle: createDto.billingCycle,
      status: createDto.status ?? SubscriptionStatus.ACTIVE,
      userId,
    });

    const saved = await this.subscriptionRepository.save(subscription);
    return this.mapToResponse(saved);
  }

  async findAll(
    userId: string,
    query: QuerySubscriptionDto,
  ): Promise<SubscriptionResponseDto[]> {
    const whereCondition: { userId: string; status?: SubscriptionStatus } = { userId };
    if (query.status) {
      whereCondition.status = query.status;
    }

    const subscriptions = await this.subscriptionRepository.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
    });

    return subscriptions.map((sub) => this.mapToResponse(sub));
  }

  async findOne(userId: string, id: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID "${id}" not found`);
    }

    if (subscription.userId !== userId) {
      throw new ForbiddenException('You do not have access to this subscription');
    }

    return this.mapToResponse(subscription);
  }

  async update(
    userId: string,
    id: string,
    updateDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID "${id}" not found`);
    }

    if (subscription.userId !== userId) {
      throw new ForbiddenException('You do not have access to this subscription');
    }

    if (updateDto.name !== undefined) {
      subscription.name = updateDto.name;
    }
    if (updateDto.amount !== undefined) {
      subscription.amount = updateDto.amount;
    }
    if (updateDto.billingDate !== undefined) {
      subscription.billingDate = this.parseDate(updateDto.billingDate);
    }
    if (updateDto.billingCycle !== undefined) {
      subscription.billingCycle = updateDto.billingCycle;
    }
    if (updateDto.status !== undefined) {
      subscription.status = updateDto.status;
    }

    const updated = await this.subscriptionRepository.save(subscription);
    return this.mapToResponse(updated);
  }

  async remove(userId: string, id: string): Promise<{ message: string; id: string }> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID "${id}" not found`);
    }

    if (subscription.userId !== userId) {
      throw new ForbiddenException('You do not have access to this subscription');
    }

    await this.subscriptionRepository.remove(subscription);
    return {
      message: 'Subscription successfully deleted',
      id,
    };
  }

  private mapToResponse(sub: Subscription): SubscriptionResponseDto {
    const billingDateStr = this.formatDate(this.parseDate(sub.billingDate));
    const nextBillingDate = this.calculateNextBillingDate(
      sub.billingDate,
      sub.billingCycle,
    );

    return {
      id: sub.id,
      name: sub.name,
      amount: Number(sub.amount),
      billingDate: billingDateStr,
      billingCycle: sub.billingCycle,
      status: sub.status,
      userId: sub.userId,
      nextBillingDate,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    };
  }

  private parseDate(input: Date | string): Date {
    if (typeof input === 'string') {
      const parts = input.split('T')[0].split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts.map(Number);
        return new Date(year, month - 1, day);
      }
    }
    const d = new Date(input);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private addMonths(baseDate: Date, monthsToAdd: number): Date {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const day = baseDate.getDate();

    const targetMonthIndex = month + monthsToAdd;
    const targetYear = year + Math.floor(targetMonthIndex / 12);
    const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;

    const daysInTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
    const targetDay = Math.min(day, daysInTargetMonth);

    return new Date(targetYear, normalizedMonth, targetDay);
  }

  private addYears(baseDate: Date, yearsToAdd: number): Date {
    const targetYear = baseDate.getFullYear() + yearsToAdd;
    const month = baseDate.getMonth();
    const day = baseDate.getDate();

    const daysInTargetMonth = new Date(targetYear, month + 1, 0).getDate();
    const targetDay = Math.min(day, daysInTargetMonth);

    return new Date(targetYear, month, targetDay);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
