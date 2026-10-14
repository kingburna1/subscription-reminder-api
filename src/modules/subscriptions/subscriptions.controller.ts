import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service.js';
import { CreateSubscriptionDto } from './dto/create-subscription.dto.js';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto.js';
import { QuerySubscriptionDto } from './dto/query-subscription.dto.js';
import { SubscriptionResponseDto } from './dto/subscription-response.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Subscription created successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  create(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.create(userId, createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List user subscriptions (optionally filtered by ?status=ACTIVE or ?status=CANCELLED)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user subscriptions',
    type: [SubscriptionResponseDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QuerySubscriptionDto,
  ): Promise<SubscriptionResponseDto[]> {
    return this.subscriptionsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve single subscription by ID' })
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription retrieved successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Subscription not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access forbidden' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing subscription' })
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription updated successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Subscription not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access forbidden' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.update(userId, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a subscription' })
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subscription deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Subscription not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access forbidden' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string; id: string }> {
    return this.subscriptionsService.remove(userId, id);
  }
}
