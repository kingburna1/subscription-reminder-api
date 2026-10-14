import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSwaggerAuthMiddleware } from './swagger-auth.middleware.js';
import { Request, Response, NextFunction } from 'express';

describe('SwaggerAuthMiddleware', () => {
  const middleware = createSwaggerAuthMiddleware({
    user: 'admin',
    pass: 'SecretSwaggerPass2026!',
  });

  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    mockResponse = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it('should ignore non-swagger routes and call next()', () => {
    mockRequest = { path: '/subscriptions', headers: {} };
    middleware(mockRequest as Request, mockResponse as Response, next);

    expect(next).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should reject unauthenticated request to /docs with 401 and WWW-Authenticate header', () => {
    mockRequest = { path: '/docs', headers: {} };
    middleware(mockRequest as Request, mockResponse as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Basic realm="Swagger API Documentation"',
    );
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.send).toHaveBeenCalledWith(
      'Authentication required to access API documentation',
    );
  });

  it('should reject request with invalid credentials with 401', () => {
    const wrongAuth = 'Basic ' + Buffer.from('admin:wrongpass').toString('base64');
    mockRequest = { path: '/docs', headers: { authorization: wrongAuth } };
    middleware(mockRequest as Request, mockResponse as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.send).toHaveBeenCalledWith('Invalid Swagger credentials');
  });

  it('should allow request with valid credentials and call next()', () => {
    const validAuth =
      'Basic ' + Buffer.from('admin:SecretSwaggerPass2026!').toString('base64');
    mockRequest = { path: '/docs', headers: { authorization: validAuth } };
    middleware(mockRequest as Request, mockResponse as Response, next);

    expect(next).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should protect /api/docs and /docs-json as well', () => {
    mockRequest = { path: '/docs-json', headers: {} };
    middleware(mockRequest as Request, mockResponse as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(401);
  });
});
