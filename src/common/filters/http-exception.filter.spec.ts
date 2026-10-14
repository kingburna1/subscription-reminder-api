import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpExceptionFilter } from './http-exception.filter.js';
import {
  BadRequestException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/subscriptions/123',
      method: 'GET',
    };

    mockHost = {
      switchToHttp: vi.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should format standard HttpException into uniform error JSON', () => {
    const exception = new NotFoundException('Subscription not found');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        path: '/subscriptions/123',
        method: 'GET',
        message: 'Subscription not found',
        error: 'Not Found',
      }),
    );
    expect(mockResponse.json.mock.calls[0][0].timestamp).toBeDefined();
  });

  it('should handle validation pipe errors with array messages', () => {
    const exception = new BadRequestException({
      statusCode: 400,
      message: ['amount must be a positive number', 'name should not be empty'],
      error: 'Bad Request',
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        path: '/subscriptions/123',
        method: 'GET',
        message: [
          'amount must be a positive number',
          'name should not be empty',
        ],
        error: 'Bad Request',
      }),
    );
  });

  it('should handle unhandled non-HttpException errors gracefully as 500', () => {
    const exception = new Error('Database connection unexpectedly dropped');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        path: '/subscriptions/123',
        method: 'GET',
        message: 'Database connection unexpectedly dropped',
      }),
    );
  });
});
