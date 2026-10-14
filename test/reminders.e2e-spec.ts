import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { BillingCycle } from '../src/modules/subscriptions/enums/billing-cycle.enum.js';
import { SubscriptionStatus } from '../src/modules/subscriptions/enums/subscription-status.enum.js';

describe('RemindersController (e2e)', () => {
  let app: INestApplication<App>;
  let user1Token: string;
  let user2Token: string;
  let user1SubId: string;
  let targetTestDate: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    // Register User 1
    const email1 = `reminder_user1_${Date.now()}@example.com`;
    const regRes1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: email1, password: 'SecurePassword123!' });
    user1Token = regRes1.body.accessToken;

    // Register User 2
    const email2 = `reminder_user2_${Date.now()}@example.com`;
    const regRes2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: email2, password: 'SecurePassword123!' });
    user2Token = regRes2.body.accessToken;

    // Create a subscription for User 1 that renews on the 16th of each month
    // We will test with referenceDate = 2026-10-14, making next renewal 2026-10-16 (due in 2 days)
    targetTestDate = '2026-10-16';
    const subRes = await request(app.getHttpServer())
      .post('/subscriptions')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'GitHub Copilot',
        amount: 10.0,
        billingDate: '2026-09-16',
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
      });

    user1SubId = subRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /reminders/trigger', () => {
    it('should allow public trigger without authentication and process due subscriptions', async () => {
      const res = await request(app.getHttpServer())
        .post('/reminders/trigger?referenceDate=2026-10-14')
        .expect(200);

      expect(res.body).toHaveProperty('scanned');
      expect(res.body).toHaveProperty('eligible');
      expect(res.body).toHaveProperty('sent');
      expect(res.body).toHaveProperty('skipped');
      expect(res.body).toHaveProperty('failed');
      expect(Array.isArray(res.body.results)).toBe(true);

      // User 1 subscription should be eligible and sent
      const subResult = res.body.results.find(
        (r: any) => r.subscriptionId === user1SubId,
      );
      expect(subResult).toBeDefined();
      expect(subResult.status).toBe('SUCCESS');
      expect(subResult.targetBillingDate).toBe(targetTestDate);
    });

    it('should enforce zero duplicates and skip already reminded subscriptions when triggered again', async () => {
      const res = await request(app.getHttpServer())
        .post('/reminders/trigger?referenceDate=2026-10-14')
        .expect(200);

      const subResult = res.body.results.find(
        (r: any) => r.subscriptionId === user1SubId,
      );
      expect(subResult).toBeDefined();
      expect(subResult.status).toBe('SKIPPED');
      expect(subResult.reason).toContain('already exists');
    });
  });

  describe('GET /subscriptions/:id/reminders', () => {
    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get(`/subscriptions/${user1SubId}/reminders`)
        .expect(401);
    });

    it('should reject access from a different user with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/subscriptions/${user1SubId}/reminders`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
    });

    it('should return 404 for a non-existent subscription UUID', async () => {
      await request(app.getHttpServer())
        .get('/subscriptions/a0000000-0000-4000-8000-000000000000/reminders')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    it('should return the reminder history for the owner', async () => {
      const res = await request(app.getHttpServer())
        .get(`/subscriptions/${user1SubId}/reminders`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].subscriptionId).toBe(user1SubId);
      expect(res.body[0].targetBillingDate).toBe(targetTestDate);
      expect(res.body[0].status).toBe('SUCCESS');
    });
  });

  describe('GET /reminders', () => {
    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer()).get('/reminders').expect(401);
    });

    it('should return all reminders for user 1', async () => {
      const res = await request(app.getHttpServer())
        .get('/reminders')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const userItem = res.body.find((r: any) => r.subscriptionId === user1SubId);
      expect(userItem).toBeDefined();
    });

    it('should return empty list for user 2 who has no subscriptions/reminders', async () => {
      const res = await request(app.getHttpServer())
        .get('/reminders')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });
});
