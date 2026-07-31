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
    } catch (e) {
      dbStatus = 'down';
    }
    return { status: dbStatus === 'ok' ? 'ok' : 'degraded', service: 'dispatch-service', db: dbStatus };
  }
}
