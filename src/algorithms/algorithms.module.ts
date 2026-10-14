import { Module } from '@nestjs/common';
import { AlgorithmsController } from './algorithms.controller.js';
import { AlgorithmsService } from './algorithms.service.js';

@Module({
  controllers: [AlgorithmsController],
  providers: [AlgorithmsService],
  exports: [AlgorithmsService],
})
export class AlgorithmsModule {}
