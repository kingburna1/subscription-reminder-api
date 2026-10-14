import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { BillingCycle } from '../src/modules/subscriptions/enums/billing-cycle.enum.js';
import { SubscriptionStatus } from '../src/modules/subscriptions/enums/subscription-status.enum.js';

describe('SubscriptionsController (e2e)', () => {
  let app: INestApplication<App>;
  let jwtToken: string;
  let otherUserJwtToken: string;
  let createdSubscriptionId: string;

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
    const user1Email = `user1_${Date.now()}@example.com`;
    const regRes1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: user1Email, password: 'SecurePassword123!' });
    jwtToken = regRes1.body.accessToken;

    // Register User 2
    const user2Email = `user2_${Date.now()}@example.com`;
    const regRes2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: user2Email, password: 'SecurePassword123!' });
    otherUserJwtToken = regRes2.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /subscriptions - should reject unauthenticated request with 401', async () => {
    await request(app.getHttpServer())
      .post('/subscriptions')
      .send({
        name: 'Netflix',
        amount: 15.99,
        billingDate: '2026-01-15',
        billingCycle: BillingCycle.MONTHLY,
      })
      .expect(401);
  });

  it('POST /subscriptions - should reject invalid DTO with 400 (amount <= 0)', async () => {
    await request(app.getHttpServer())
      .post('/subscriptions')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Free Trial',
        amount: -5,
        billingDate: '2026-01-15',
        billingCycle: BillingCycle.MONTHLY,
      })
      .expect(400);
  });

  it('POST /subscriptions - should create subscription with calculated nextBillingDate', async () => {
    const res = await request(app.getHttpServer())
      .post('/subscriptions')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Spotify Premium',
        amount: 9.99,
        billingDate: '2026-01-15',
        billingCycle: BillingCycle.MONTHLY,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Spotify Premium');
    expect(res.body.amount).toBe(9.99);
    expect(res.body.status).toBe(SubscriptionStatus.ACTIVE);
    expect(res.body.nextBillingDate).toBeDefined();
    createdSubscriptionId = res.body.id;
  });

  it('GET /subscriptions - should list subscriptions for authenticated user', async () => {
    const res = await request(app.getHttpServer())
      .get('/subscriptions')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].nextBillingDate).toBeDefined();
  });

  it('GET /subscriptions?status=ACTIVE - should filter by active status', async () => {
    const res = await request(app.getHttpServer())
      .get('/subscriptions?status=ACTIVE')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((sub: any) => {
      expect(sub.status).toBe(SubscriptionStatus.ACTIVE);
    });
  });

  it('GET /subscriptions/:id - should retrieve single subscription with ownership', async () => {
    const res = await request(app.getHttpServer())
      .get(`/subscriptions/${createdSubscriptionId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(res.body.id).toBe(createdSubscriptionId);
    expect(res.body.name).toBe('Spotify Premium');
    expect(res.body.nextBillingDate).toBeDefined();
  });

  it('GET /subscriptions/:id - should deny access to another user (403)', async () => {
    await request(app.getHttpServer())
      .get(`/subscriptions/${createdSubscriptionId}`)
      .set('Authorization', `Bearer ${otherUserJwtToken}`)
      .expect(403);
  });

  it('PATCH /subscriptions/:id - should update subscription', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/subscriptions/${createdSubscriptionId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Spotify Family Plan',
        amount: 19.99,
      })
      .expect(200);

    expect(res.body.name).toBe('Spotify Family Plan');
    expect(res.body.amount).toBe(19.99);
  });

  it('DELETE /subscriptions/:id - should deny deletion to another user (403)', async () => {
    await request(app.getHttpServer())
      .delete(`/subscriptions/${createdSubscriptionId}`)
      .set('Authorization', `Bearer ${otherUserJwtToken}`)
      .expect(403);
  });

  it('DELETE /subscriptions/:id - should delete subscription for owner (200)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/subscriptions/${createdSubscriptionId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(res.body.message).toContain('deleted');

    // Confirm it is gone
    await request(app.getHttpServer())
      .get(`/subscriptions/${createdSubscriptionId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(404);
  });
});
