import { Request, Response, NextFunction } from 'express';

export interface SwaggerAuthOptions {
  user: string;
  pass: string;
}

/**
 * Express middleware to protect Swagger documentation endpoints with HTTP Basic Authentication.
 */
export function createSwaggerAuthMiddleware(options: SwaggerAuthOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const path = req.path || req.url || '';
    const isSwaggerRoute =
      path.startsWith('/api/docs') ||
      path === '/api/docs';

    if (!isSwaggerRoute) {
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader(
        'WWW-Authenticate',
        'Basic realm="Swagger API Documentation"',
      );
      res.status(401).send('Authentication required to access API documentation');
      return;
    }

    try {
      const base64Credentials = authHeader.split(' ')[1];
      const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [username, ...passwordParts] = decoded.split(':');
      const password = passwordParts.join(':');

      if (username === options.user && password === options.pass) {
        return next();
      }
    } catch {
      // Fall through to 401
    }

    res.setHeader(
      'WWW-Authenticate',
      'Basic realm="Swagger API Documentation"',
    );
    res.status(401).send('Invalid Swagger credentials');
  };
}
