import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '@besonc/shared-db';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'down';
    }
    return { status: dbStatus === 'ok' ? 'ok' : 'degraded', service: 'cod-service', db: dbStatus };
  }
}
