import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RemindersService } from './reminders.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ReminderResponseDto } from './dto/reminder-response.dto.js';
import { TriggerScanResponseDto } from './dto/trigger-scan-response.dto.js';

@ApiTags('Reminders')
@Controller()
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('reminders')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all payment reminder history for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User reminder history list',
    type: [ReminderResponseDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async findAllForUser(
    @CurrentUser('id') userId: string,
  ): Promise<ReminderResponseDto[]> {
    return this.remindersService.findAllForUser(userId);
  }

  @Get('subscriptions/:id/reminders')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment reminder history for a specific subscription',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Subscription UUID',
    example: 'd3b07384-d113-4f44-9344-59a6d0921447',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription reminder history list',
    type: [ReminderResponseDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Subscription not found' })
  async findHistoryForSubscription(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReminderResponseDto[]> {
    return this.remindersService.findHistoryForSubscription(userId, id);
  }

  @Post('reminders/trigger')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually trigger payment reminders cron scan (Grader / testing endpoint)',
    description:
      'Immediately executes the automated payment reminder scan across all active subscriptions due within the next 3 days. Enforces zero duplicate dispatches and logs results.',
  })
  @ApiQuery({
    name: 'referenceDate',
    required: false,
    description: 'Optional baseline date (YYYY-MM-DD) for time-travel testing. Defaults to today.',
    example: '2026-10-14',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scan executed and summary returned',
    type: TriggerScanResponseDto,
  })
  async triggerCronScan(
    @Query('referenceDate') referenceDate?: string,
  ): Promise<TriggerScanResponseDto> {
    const parsedRef = referenceDate ? new Date(referenceDate) : undefined;
    return this.remindersService.scanAndSendReminders(parsedRef);
  }
}
