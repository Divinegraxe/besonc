import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';

/**
 * Proxy Module — routes incoming requests to the right microservice.
 *
 * v1: simple path-based proxy. In Sprint 5+ we replace with
 * proper service discovery + circuit breakers (per v3.1 plan).
 */
@Module({
  controllers: [ProxyController],
})
export class ProxyModule {}
