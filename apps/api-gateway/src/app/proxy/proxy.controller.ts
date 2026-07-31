import { All, Controller, Req, Res, HttpException, HttpStatus, Logger, RawBodyRequest } from '@nestjs/common';
import { Request, Response } from 'express';
import { CONFIG } from '@besonc/shared-config';

/**
 * Catch-all proxy. Routes incoming requests to the right microservice
 * based on the first path segment after the global prefix.
 *
 * NestJS already strips the global prefix (`api/v1`) before the
 * controller runs, so the controller itself doesn't need a prefix.
 * We use `req.originalUrl` to get the full path including the query
 * string (req.path is just the pathname, req.url may have been
 * rewritten by middleware).
 *
 * Examples:
 *   POST /api/v1/auth/otp         -> http://localhost:3001/auth/otp
 *   POST /api/v1/auth/verify      -> http://localhost:3001/auth/verify
 *   GET  /api/v1/users/me         -> http://localhost:3002/users/me
 *   GET  /api/v1/catalogue/vendors?category=FO
 *                                -> http://localhost:3003/catalogue/vendors?category=FO
 *
 * v1 implementation: simple pass-through. v2 (Sprint 5+): add auth
 * validation, rate limiting, and circuit breakers.
 */
@Controller()
export class ProxyController {
  private readonly logger = new Logger('ProxyController');

  @All('*')
  async proxy(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    // Use originalUrl to get the full path including the /api/v1 prefix
    // and any query string.
    const fullUrl = req.originalUrl;
    const path = fullUrl.split('?')[0];
    const queryString = fullUrl.includes('?') ? fullUrl.substring(fullUrl.indexOf('?')) : '';

    // Strip /api/v1 prefix
    const servicePath = path.replace(/^\/api\/v1/, '') || '/';

    // Route by first path segment
    const firstSegment = servicePath.split('/').filter(Boolean)[0];
    const targetBaseUrl = this.resolveServiceUrl(firstSegment, servicePath);

    if (!targetBaseUrl) {
      throw new HttpException(`Unknown service: ${firstSegment}`, HttpStatus.NOT_FOUND);
    }

    // The BFF services expose routes under their own /bff/<role> prefix
    // (set as global prefix in main.ts). The gateway preserves that
    // path as-is and just looks up the right BFF base URL.
    // Example: /api/v1/bff/customer/auth/otp
    //       -> http://localhost:4000/bff/customer/auth/otp
    const targetPath = servicePath;

    const targetUrl = `${targetBaseUrl}${targetPath}${queryString}`;

    // Use the raw body buffer (rawBody: true in main.ts). We don't
    // touch the parsed `req.body` because that has already consumed
    // the stream and re-serialising it was causing the upstream
    // connection to abort before the body finished.
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const body = hasBody && req.rawBody && req.rawBody.length > 0
      ? req.rawBody
      : undefined;

    try {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (value && !['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
          headers[key] = Array.isArray(value) ? value.join(',') : value;
        }
      }

      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: body as BodyInit | undefined,
      });

      const responseBody = await upstream.text();
      res.status(upstream.status);
      res.set('content-type', upstream.headers.get('content-type') ?? 'application/json');
      res.send(responseBody);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Proxy error for ${req.method} ${fullUrl} -> ${targetUrl}: ${message}`);
      throw new HttpException(`Upstream error: ${message}`, HttpStatus.BAD_GATEWAY);
    }
  }

  private resolveServiceUrl(segment: string, servicePath: string): string | null {
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
      cod: CONFIG.endpoints.codService,
      chat: CONFIG.endpoints.chatService,
      search: CONFIG.endpoints.searchService,
      ratings: CONFIG.endpoints.ratingService,
      tips: CONFIG.endpoints.tipService,
      promos: CONFIG.endpoints.promoService,
      // BFFs: first segment is "bff" and the second determines which
      // BFF (customer, vendor, rider, admin).
      bff: this.resolveBffUrl(servicePath),
    };
    return map[segment] ?? null;
  }

  private resolveBffUrl(servicePath: string): string | null {
    // servicePath is something like "/bff/customer/auth/otp".
    const role = servicePath.split('/').filter(Boolean)[1];
    switch (role) {
      case 'customer':
        return CONFIG.endpoints.bffCustomer;
      case 'vendor':
        return CONFIG.endpoints.bffVendor;
      case 'rider':
        return CONFIG.endpoints.bffRider;
      case 'admin':
        return CONFIG.endpoints.bffAdmin;
      default:
        return null;
    }
  }
}
