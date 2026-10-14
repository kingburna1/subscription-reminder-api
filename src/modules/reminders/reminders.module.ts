import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReminderHistory } from './entities/reminder-history.entity.js';
import { Subscription } from '../subscriptions/entities/subscription.entity.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { MailModule } from '../mail/mail.module.js';
import { RemindersService } from './reminders.service.js';
import { RemindersScheduler } from './reminders.scheduler.js';
import { RemindersController } from './reminders.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReminderHistory, Subscription]),
    SubscriptionsModule,
    MailModule,
  ],
  controllers: [RemindersController],
  providers: [RemindersService, RemindersScheduler],
  exports: [RemindersService, TypeOrmModule],
})
export class RemindersModule {}
