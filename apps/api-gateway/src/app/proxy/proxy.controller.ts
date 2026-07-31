import { All, Controller, Req, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { CONFIG } from '@besonc/shared-config';

/**
 * Catch-all proxy. Routes requests based on the first path segment.
 *
 * Examples:
 *   POST /api/v1/auth/otp         -> http://localhost:3001/auth/otp
 *   POST /api/v1/auth/verify      -> http://localhost:3001/auth/verify
 *   GET  /api/v1/users/me         -> http://localhost:3002/users/me
 *
 * v1 implementation: simple pass-through. v2 (Sprint 5+): add auth
 * validation, rate limiting, and circuit breakers.
 */
@Controller('api/v1')
export class ProxyController {
  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    // Strip /api/v1 prefix
    const path = req.path.replace(/^\/api\/v1/, '');

    // Route by first path segment
    const firstSegment = path.split('/')[1];
    const targetBaseUrl = this.resolveServiceUrl(firstSegment);

    if (!targetBaseUrl) {
      throw new HttpException(`Unknown service: ${firstSegment}`, HttpStatus.NOT_FOUND);
    }

    const targetUrl = `${targetBaseUrl}${path}`;

    try {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (value && !['host', 'connection'].includes(key.toLowerCase())) {
          headers[key] = Array.isArray(value) ? value.join(',') : value;
        }
      }

      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' && req.body
          ? JSON.stringify(req.body)
          : undefined,
      });

      const responseBody = await upstream.text();
      res.status(upstream.status);
      res.set('content-type', upstream.headers.get('content-type') ?? 'application/json');
      res.send(responseBody);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new HttpException(`Upstream error: ${message}`, HttpStatus.BAD_GATEWAY);
    }
  }

  private resolveServiceUrl(segment: string): string | null {
    const map: Record<string, string | undefined> = {
      auth: CONFIG.endpoints.authService,
      users: CONFIG.endpoints.userService,
      catalogue: CONFIG.endpoints.catalogueService,
      orders: CONFIG.endpoints.orderService,
      dispatch: CONFIG.endpoints.dispatchService,
      tracking: CONFIG.endpoints.trackingService,
      payments: CONFIG.endpoints.paymentService,
      notifications: CONFIG.endpoints.notificationService,
      chat: CONFIG.endpoints.chatService,
      media: CONFIG.endpoints.mediaService,
      search: CONFIG.endpoints.searchService,
      pricing: CONFIG.endpoints.pricingService,
      admin: CONFIG.endpoints.adminService,
    };
    const url = map[segment];
    return url ?? null;
  }

  private resolveBff(segment: string): string | null {
    // Handle /bff/customer, /bff/vendor, /bff/rider, /bff/admin
    if (segment === 'bff') return null; // bff handled separately
    return null;
  }
}
