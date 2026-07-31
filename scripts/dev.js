#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * BESONC local development runner.
 *
 * Runs services directly from TypeScript source via `tsx`, so we skip the
 * compile-then-link dance. Each service has its own tsconfig that uses
 * TypeScript path mappings to resolve @besonc/* libs.
 *
 * Sprint 1-4 services:
 *   - API Gateway      (port 3000)
 *   - Auth Service     (port 3001)
 *   - User Service     (port 3002)
 *   - Catalogue        (port 3003)
 *   - Order            (port 3004)
 *   - Payment          (port 3007)
 *   - Media            (port 3010)
 *   - Pricing          (port 3012)
 *   - Customer BFF     (port 4000)
 *   - Customer Web     (port 4200)
 */
const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const tsx = path.join(root, 'node_modules', '.bin', 'tsx');
const TSX_TSCONFIG_PATH = path.join(root, 'tsconfig.json');
const nx = path.join(root, 'node_modules', '.bin', 'nx');

const services = [
  { name: 'api-gateway',  cmd: tsx,  args: ['apps/api-gateway/src/main.ts'],         env: { PORT: '3000' } },
  { name: 'auth-service', cmd: tsx,  args: ['apps/auth-service/src/main.ts'],        env: { PORT: '3001' } },
  { name: 'user-service', cmd: tsx,  args: ['apps/user-service/src/main.ts'],        env: { PORT: '3002' } },
  { name: 'catalogue',    cmd: tsx,  args: ['apps/catalogue-service/src/main.ts'],   env: { PORT: '3003' } },
  { name: 'order',        cmd: tsx,  args: ['apps/order-service/src/main.ts'],       env: { PORT: '3004' } },
  { name: 'payment',      cmd: tsx,  args: ['apps/payment-service/src/main.ts'],     env: { PORT: '3007' } },
  { name: 'media',        cmd: tsx,  args: ['apps/media-service/src/main.ts'],       env: { PORT: '3010' } },
  { name: 'pricing',      cmd: tsx,  args: ['apps/pricing-service/src/main.ts'],     env: { PORT: '3012' } },
  { name: 'customer-bff', cmd: tsx,  args: ['apps/customer-bff/src/main.ts'],        env: { PORT: '4000' } },
  { name: 'customer-web', cmd: nx,   args: ['start', 'customer-web'],                 env: { PORT: '4200' } },
];

const procs = services.map(({ name, cmd, args, env }) => {
  const proc = spawn(cmd, args, {
    cwd: root,
    env: { ...process.env, ...env, TSX_TSCONFIG_PATH, TS_NODE_TRANSPILE_ONLY: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const prefix = `[${name}]`;
  proc.stdout.on('data', (data) => process.stdout.write(data.toString().split('\n').map((l) => l ? `${prefix} ${l}` : '').join('\n') + '\n'));
  proc.stderr.on('data', (data) => process.stderr.write(data.toString().split('\n').map((l) => l ? `${prefix} ${l}` : '').join('\n') + '\n'));
  proc.on('exit', (code) => console.log(`${prefix} exited with code ${code}`));
  return proc;
});

console.log('\n🚀 BESONC dev mode (tsx, no compile needed)...');
console.log('   Customer Web:     http://localhost:4200');
console.log('   API Gateway:      http://localhost:3000/api/v1');
console.log('   Auth Service:     http://localhost:3001/auth');
console.log('   User Service:     http://localhost:3002/users');
console.log('   Catalogue:        http://localhost:3003/catalogue');
console.log('   Order Service:    http://localhost:3004/orders');
console.log('   Payment Service:  http://localhost:3007/payments');
console.log('   Media Service:    http://localhost:3010/media');
console.log('   Pricing Service:  http://localhost:3012/pricing');
console.log('   Customer BFF:     http://localhost:4000/bff/customer');
console.log('   Mobile app:       pnpm run dev:mobile');
console.log('   Press Ctrl+C to stop all services.\n');

const shutdown = () => {
  console.log('\nShutting down...');
  procs.forEach((p) => p.kill('SIGTERM'));
  setTimeout(() => process.exit(0), 2000);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
