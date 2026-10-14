import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createObserveModule } from '@nestjs/observe';
import { APP_GUARD } from '@nestjs/core';
import { User } from './modules/users/entities/user.entity.js';
import { Subscription } from './modules/subscriptions/entities/subscription.entity.js';
import { ReminderHistory } from './modules/reminders/entities/reminder-history.entity.js';
import { ScheduleModule } from '@nestjs/schedule';
import { AlgorithmsModule } from './algorithms/algorithms.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module.js';
import { MailModule } from './modules/mail/mail.module.js';
import { RemindersModule } from './modules/reminders/reminders.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

const env = process.env.NODE_ENV || 'local';

@Module({
  imports: [
    AlgorithmsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${env}.local`,
        `.env.${env}`,
        '.env.local',
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>('DATABASE_URL');
        const isSsl =
          configService.get<string>('DB_SSL') === 'true' ||
          Boolean(dbUrl && dbUrl.includes('sslmode=require'));
        const entities = [User, Subscription, ReminderHistory];

        if (dbUrl) {
          return {
            type: 'postgres',
            url: dbUrl,
            entities,
            autoLoadEntities: true,
            synchronize: configService.get<string>('NODE_ENV') !== 'production',
            ssl: isSsl ? { rejectUnauthorized: false } : false,
          };
        }

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: Number(configService.get<number>('DB_PORT', 5432)),
          username: configService.get<string>('DB_USERNAME', 'subscription_app'),
          password: configService.get<string>('DB_PASSWORD', ''),
          database: configService.get<string>('DB_DATABASE', 'subscription_reminder_db'),
          entities,
          autoLoadEntities: true,
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
          ssl: isSsl ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'subscription-reminder-api',
    }),
    UsersModule,
    AuthModule,
    SubscriptionsModule,
    ScheduleModule.forRoot(),
    MailModule,
    RemindersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
