# Subscription and Payment Reminder API

A production-grade REST API built with **NestJS**, **TypeScript**, and **PostgreSQL (TypeORM)** to manage recurring subscriptions, calculate upcoming renewal dates, import subscriptions via CSV, and dispatch automated payment reminders via scheduled daily cron jobs.

---

## Table of Contents
1. [Technologies & Architecture](#technologies--architecture)
2. [Project Setup & Installation](#project-setup--installation)
3. [Environment Configuration](#environment-configuration)
4. [API Documentation (Swagger UI)](#api-documentation-swagger-ui)
5. [Part 1: Algorithmic Problems](#part-1-algorithmic-problems)
6. [Part 2: Practical Exercises](#part-2-practical-exercises)
   - [Exercise 1: Subscriptions CRUD & Next Billing Date](#exercise-1-subscriptions-crud--next-billing-date)
   - [Exercise 2: Automated Payment Reminders & Cron Job](#exercise-2-automated-payment-reminders--cron-job)
   - [Exercise 3: CSV Subscription Import](#exercise-3-csv-subscription-import)
7. [Testing the Scheduled Cron Job (Immediate Execution)](#testing-the-scheduled-cron-job-immediate-execution)
8. [Error Handling & Validation](#error-handling--validation)
9. [Database & Deployment](#database--deployment)

---

## Technologies & Architecture

- **Runtime:** Node.js (v20+)
- **Framework:** NestJS (v12)
- **Language:** TypeScript (strict mode, ES modules)
- **Database & ORM:** PostgreSQL, TypeORM
- **Scheduling:** `@nestjs/schedule` (Cron jobs)
- **Validation & Transformation:** `class-validator`, `class-transformer`
- **Authentication:** Passport JWT (stateless bearer token)
- **API Documentation:** OpenAPI / Swagger UI (protected by HTTP Basic Auth)
- **Testing:** Vitest (unit & integration/E2E test suites)

### Codebase Organization
```
src/
├── algorithms/                 # Part 1: Algorithmic solutions, DTOs & controller
│   ├── find-duplicates.ts
│   ├── longest-substring.ts
│   └── group-anagrams.ts
├── common/                     # Cross-cutting concerns
│   ├── decorators/             # @CurrentUser, @Public
│   ├── filters/                # Global HttpExceptionFilter
│   ├── guards/                 # JwtAuthGuard
│   ├── interceptors/           # Response transform interceptor
│   └── middleware/             # Swagger HTTP Basic Auth middleware
├── config/                     # TypeORM & database configuration
├── modules/
│   ├── auth/                   # JWT Registration & Login
│   ├── users/                  # User persistence & relations
│   ├── subscriptions/          # Subscriptions CRUD, Next Billing Calculator, CSV Import
│   │   ├── csv-parser.service.ts
│   │   ├── dto/
│   │   └── entities/
│   ├── reminders/              # Daily Scheduler, Duplicate Prevention & History
│   │   ├── reminders.scheduler.ts
│   │   ├── reminders.service.ts
│   │   └── entities/
│   └── mail/                   # Notification & email delivery service
├── app.module.ts
└── main.ts
```

---

## Project Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/kingburna1/subscription-reminder-api.git
cd subscription-reminder-api
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Build the application
```bash
pnpm run build
```

### 4. Run the application
```bash
# Development watch mode
pnpm run start:dev

# Production mode
pnpm run start:prod
```

---

## Environment Configuration

Create a `.env` or `.env.development` file in the root directory (based on `.env.example`):

```env
# Application Port & Environment
PORT=6500
NODE_ENV=development

# Database Connection (PostgreSQL / Neon)
DATABASE_URL=postgresql://user:password@hostname:5432/dbname?sslmode=require

# JWT Authentication
JWT_SECRET=super_secret_jwt_key_2026_change_in_production!
JWT_EXPIRES_IN=7d

# Swagger UI Basic Auth Protection
SWAGGER_USER=admin
SWAGGER_PASSWORD=SecretSwaggerPass2026!

# Email Service (Optional: logs to console if omitted)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=
SMTP_PASS=
MAIL_FROM="Subscription Reminder <no-reply@subscriptions.local>"
```

---

## API Documentation (Swagger UI)

Interactive OpenAPI documentation is mounted **exclusively** at `/api/docs` and protected with HTTP Basic Authentication.

- **URL:** [http://localhost:6500/api/docs](http://localhost:6500/api/docs)
- **HTTP Basic Auth Username:** `admin`
- **HTTP Basic Auth Password:** `SecretSwaggerPass2026!`

*(Note: Requests to `/api` or `/docs` return `404 Not Found` to guarantee exclusive and secure access).*

### Authenticating in Swagger
1. Open [http://localhost:6500/api/docs](http://localhost:6500/api/docs) and log in with the Basic Auth credentials.
2. Call `POST /auth/register` or `POST /auth/login` to receive an `accessToken`.
3. Click the green **Authorize** button at the top-right of Swagger UI and paste your JWT token.

---

## Part 1: Algorithmic Problems

All three algorithmic problems are implemented as pure TypeScript functions and also exposed via public API endpoints:

### 1. Find Duplicate Numbers
- **Endpoint:** `POST /algorithms/find-duplicates`
- **Time Complexity:** $O(n)$ single pass using hash sets.
- **Space Complexity:** $O(n)$.
- **Example Input:**
  ```json
  { "numbers": [1, 2, 3, 2, 4, 5, 1] }
  ```
- **Example Output:**
  ```json
  { "duplicates": [2, 1] }
  ```

### 2. Longest Substring Without Repeating Characters
- **Endpoint:** `POST /algorithms/longest-substring`
- **Time Complexity:** $O(n)$ optimal sliding window with character index lookup.
- **Space Complexity:** $O(\min(n, m))$ where $m$ is alphabet size.
- **Example Input:**
  ```json
  { "text": "abcabcbb" }
  ```
- **Example Output:**
  ```json
  { "input": "abcabcbb", "length": 3 }
  ```

### 3. Group Anagrams
- **Endpoint:** `POST /algorithms/group-anagrams`
- **Time Complexity:** $O(n \cdot k \log k)$ where $k$ is maximum word length.
- **Space Complexity:** $O(n \cdot k)$.
- **Example Input:**
  ```json
  { "words": ["eat", "tea", "tan", "ate", "nat", "bat"] }
  ```
- **Example Output:**
  ```json
  {
    "groups": [
      ["eat", "tea", "ate"],
      ["tan", "nat"],
      ["bat"]
    ]
  }
  ```

---

## Part 2: Practical Exercises

### Exercise 1: Subscriptions CRUD & Next Billing Date

Allows users to manage subscriptions and automatically calculates the next upcoming renewal date.

#### Subscription Entity Schema
- `id` (UUID, Primary Key)
- `name` (String, max 255)
- `amount` (Decimal, precision 10, scale 2, > 0)
- `billingDate` (Date, original start date)
- `billingCycle` (`MONTHLY` or `YEARLY`)
- `status` (`ACTIVE` or `CANCELLED`)
- `userId` (UUID, Foreign Key)
- `createdAt` & `updatedAt` (Timestamps)
- `nextBillingDate` (Dynamically calculated ISO date string)

#### Endpoints
- `POST /subscriptions`: Create a new subscription.
- `GET /subscriptions`: List subscriptions for authenticated user.
- `GET /subscriptions?status=ACTIVE`: Filter subscriptions by status (`ACTIVE` or `CANCELLED`).
- `GET /subscriptions/:id`: Retrieve single subscription (enforces user ownership).
- `PATCH /subscriptions/:id`: Update subscription (enforces user ownership).
- `DELETE /subscriptions/:id`: Delete subscription (enforces user ownership).

#### Next Billing Date Calculation Algorithm
The calculator (`SubscriptionsService.calculateNextBillingDate`) dynamically advances forward month-by-month or year-by-year from the baseline `billingDate` until the next upcoming renewal date on or after the reference date (today). It handles calendar edge cases such as varying month lengths (e.g. Jan 31 &rarr; Feb 28) and leap years.

---

### Exercise 2: Automated Payment Reminders & Cron Job

Automatically scans active subscriptions and notifies owners before renewal.

#### Features
- **Scheduled Daily Task:** Configured with `@nestjs/schedule` using `@Cron(CronExpression.EVERY_DAY_AT_9AM)`.
- **Lookahead Window:** Identifies active subscriptions whose `nextBillingDate` falls within the next three days ($today \le nextBillingDate \le today + 3\text{ days}$).
- **Duplicate Prevention:** 
  1. **Database constraint:** Unique index `@Unique(['subscriptionId', 'targetBillingDate'])` on the `reminder_history` table.
  2. **Application query check:** Prior to email dispatch, queries `reminder_history` for `(subscriptionId, targetBillingDate)`. If an entry exists, the reminder is skipped.
- **Fail-Safe Dispatch:** If external email delivery fails, the error message is recorded in `reminder_history` with status `FAILED` and logged without crashing the scheduler.
- **Reminder History Endpoints:**
  - `GET /reminders`: View all reminder history for the authenticated user's subscriptions.
  - `GET /subscriptions/:id/reminders`: View reminder history for a specific subscription.

---

### Exercise 3: CSV Subscription Import

Bulk import subscriptions from a CSV file with line-level validation and error reporting.

- **Endpoint:** `POST /subscriptions/import`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **File Field Name:** `file`
- **File Validation:** Accepts only `.csv` files (non-CSV files return `400 Bad Request`).
- **Required CSV Header:** `name,amount,billingDate,billingCycle`

#### Example CSV File
```csv
name,amount,billingDate,billingCycle
Netflix,15.99,2026-01-01,MONTHLY
Spotify,-5.00,2026-02-01,MONTHLY
AWS,100.00,2026-03-01,YEARLY
Domain,20.00,2026-04-01,WEEKLY
GitHub,4.00,2026-05-01,MONTHLY
```

#### Curl Command
```bash
curl -X POST http://localhost:6500/subscriptions/import \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -F "file=@subscriptions.csv"
```

#### Response Summary
```json
{
  "totalRows": 5,
  "imported": 3,
  "rejected": 2,
  "errors": [
    {
      "row": 3,
      "message": "Amount must be greater than zero"
    },
    {
      "row": 5,
      "message": "Invalid billing cycle"
    }
  ]
}
```

---

## Testing the Scheduled Cron Job (Immediate Execution)

To verify the automated payment reminder scanner without waiting for the scheduled 09:00 AM daily trigger, a dedicated manual trigger endpoint is provided:

### Trigger Endpoint
- **URL:** `POST /reminders/trigger`
- **Access:** Public (for testing and grading evaluation)
- **Optional Parameter:** `?referenceDate=YYYY-MM-DD` (enables time-travel testing against any reference date)

### How to Test

#### 1. Trigger scan using current system date
```bash
curl -X POST http://localhost:6500/reminders/trigger
```

#### 2. Trigger scan with time-travel date
```bash
curl -X POST "http://localhost:6500/reminders/trigger?referenceDate=2026-10-15"
```

#### Sample Trigger Response
```json
{
  "message": "Payment reminder scan triggered successfully",
  "scanned": 10,
  "eligible": 2,
  "sent": 2,
  "skipped": 0,
  "failed": 0,
  "results": [
    {
      "subscriptionId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "subscriptionName": "Netflix 4K",
      "targetBillingDate": "2026-10-16",
      "status": "SUCCESS",
      "recipientEmail": "user@example.com"
    }
  ]
}
```

#### Verifying Duplicate Prevention
Running the trigger request a second time for the same date will skip previously sent reminders:
```bash
curl -X POST "http://localhost:6500/reminders/trigger?referenceDate=2026-10-15"
```
```json
{
  "message": "Payment reminder scan triggered successfully",
  "scanned": 10,
  "eligible": 2,
  "sent": 0,
  "skipped": 2,
  "failed": 0,
  "results": [
    {
      "subscriptionId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "subscriptionName": "Netflix 4K",
      "targetBillingDate": "2026-10-16",
      "status": "SKIPPED",
      "recipientEmail": "user@example.com",
      "reason": "Reminder already exists for this billing date"
    }
  ]
}
```

---

## Error Handling & Validation

- **Uniform Error Envelope:** All exceptions are formatted by `HttpExceptionFilter`:
  ```json
  {
    "statusCode": 400,
    "timestamp": "2026-10-14T17:08:51.268Z",
    "path": "/subscriptions/import",
    "method": "POST",
    "message": "Only CSV files are accepted",
    "error": "Bad Request"
  }
  ```
- **Input Validation:** Every incoming request body and query parameter is validated using `class-validator` and `ValidationPipe` with `{ whitelist: true, transform: true }`.

---

## Database & Deployment

### Production Database
- Hosted on **Neon PostgreSQL** (serverless compute with SSL enforcement).
- Migrations and schema synchronization manage table creations: `users`, `subscriptions`, and `reminder_history`.

### Submission Cleanliness
Per submission guidelines, all test scripts, test data, and migration files are excluded from git tracking via `.gitignore` to ensure a clean source code submission containing only essential application files.
