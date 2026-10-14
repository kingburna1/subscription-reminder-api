import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = Number(configService.get<number>('PORT', 6500));
  const nodeEnv = configService.get<string>('NODE_ENV', 'local');

  // Swagger OpenAPI documentation setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Subscription Reminder API')
    .setDescription('API documentation for the Subscription Reminder Service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  Logger.log(`Application is running in [${nodeEnv}] mode on port ${port}`, 'Bootstrap');
  Logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`, 'Bootstrap');
}
await bootstrap();
