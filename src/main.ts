import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { createSwaggerAuthMiddleware } from './common/middleware/swagger-auth.middleware.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  // Global Validation Pipe: whitelist unknown properties and transform payloads to DTO instances
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Global HTTP Exception Filter: uniform JSON error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  const configService = app.get(ConfigService);
  const port = Number(configService.get<number>('PORT', 6500));
  const nodeEnv = configService.get<string>('NODE_ENV', 'local');

  // HTTP Basic Auth protection for Swagger documentation
  const swaggerUser = configService.get<string>('SWAGGER_USER', 'admin');
  const swaggerPassword = configService.get<string>(
    'SWAGGER_PASSWORD',
    'SecretSwaggerPass2026!',
  );

  app.use(
    createSwaggerAuthMiddleware({
      user: swaggerUser,
      pass: swaggerPassword,
    }),
  );

  // Swagger OpenAPI documentation setup mounted at /docs with JWT Bearer Auth enabled
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Subscription Reminder API')
    .setDescription(
      'Production-grade REST API documentation for Subscription Management, Next Billing Date Calculation, and Automated Payment Reminders.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT token (without Bearer prefix)',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  // Mounted exclusively at /api/docs
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  Logger.log(`Application is running in [${nodeEnv}] mode on port ${port}`, 'Bootstrap');
  Logger.log(`Swagger documentation available at http://localhost:${port}/api/docs (Basic Auth Protected)`, 'Bootstrap');
}
await bootstrap();
