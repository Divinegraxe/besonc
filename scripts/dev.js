#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * BESONC local development runner.
 *
 * Why ts-node and NOT tsx: NestJS DI relies on TypeScript's
 * `emitDecoratorMetadata` flag (constructor parameter type info is stored
 * via Reflect.metadata so the IoC container can resolve the right
 * provider). `tsx` is built on esbuild and does NOT emit decorator
 * metadata, so controllers are constructed with `undefined` dependencies
 * and you get cryptic 500s like "Cannot read properties of undefined
 * (reading 'listByCategory')" even though NestJS logs the modules as
 * initialized.
 *
 * Confirmed with a single-service test:
 *   tsx   -> 500s on every route
 *   ts-node --transpile-only -r tsconfig-paths/register -P <app>/tsconfig.json
 *         -> constructor runs, services are injected, real data is returned
 *
 * Each service has its own tsconfig that uses TypeScript path mappings to
 * resolve @besonc/* libs. `tsconfig-paths/register` reads those mappings
 * at runtime so we don't have to compile before running.
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
const tsNode = path.join(root, 'node_modules', '.bin', 'ts-node');
const nx = path.join(root, 'node_modules', '.bin', 'nx');

// Helper: build a ts-node command for a given service. Each app has its
// own tsconfig (so its own @besonc/* path mappings and decorator flags).
const tsNodeCmd = (appDir, entry) => [
  tsNode,
  '--transpile-only',
  '-r', 'tsconfig-paths/register',
  '-P', path.join(root, 'apps', appDir, 'tsconfig.json'),
  entry,
];

const services = [
  { name: 'api-gateway',  args: tsNodeCmd('api-gateway',  'apps/api-gateway/src/main.ts'),         env: { PORT: '3000' } },
  { name: 'auth-service', args: tsNodeCmd('auth-service', 'apps/auth-service/src/main.ts'),         env: { PORT: '3001' } },
  { name: 'user-service', args: tsNodeCmd('user-service', 'apps/user-service/src/main.ts'),         env: { PORT: '3002' } },
  { name: 'catalogue',    args: tsNodeCmd('catalogue-service', 'apps/catalogue-service/src/main.ts'), env: { PORT: '3003' } },
  { name: 'order',        args: tsNodeCmd('order-service', 'apps/order-service/src/main.ts'),       env: { PORT: '3004' } },
  { name: 'payment',      args: tsNodeCmd('payment-service', 'apps/payment-service/src/main.ts'),   env: { PORT: '3007' } },
  { name: 'media',        args: tsNodeCmd('media-service', 'apps/media-service/src/main.ts'),       env: { PORT: '3010' } },
  { name: 'pricing',      args: tsNodeCmd('pricing-service', 'apps/pricing-service/src/main.ts'),   env: { PORT: '3012' } },
  { name: 'customer-bff', args: tsNodeCmd('customer-bff', 'apps/customer-bff/src/main.ts'),         env: { PORT: '4000' } },
  { name: 'customer-web', cmd: nx, args: ['start', 'customer-web'],                                  env: { PORT: '4200' } },
];

const procs = services.map(({ name, cmd, args, env }) => {
  const proc = spawn(cmd || args[0], cmd ? args : args.slice(1), {
    cwd: root,
    env: { ...process.env, ...env, TS_NODE_TRANSPILE_ONLY: '1', TS_NODE_FAST: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const prefix = `[${name}]`;
  proc.stdout.on('data', (data) =>
    process.stdout.write(
      data
        .toString()
        .split('\n')
        .map((l) => (l ? `${prefix} ${l}` : ''))
        .join('\n') + '\n',
    ),
  );
  proc.stderr.on('data', (data) =>
    process.stderr.write(
      data
        .toString()
        .split('\n')
        .map((l) => (l ? `${prefix} ${l}` : ''))
        .join('\n') + '\n',
    ),
  );
  proc.on('exit', (code) => console.log(`${prefix} exited with code ${code}`));
  return proc;
});

console.log('\n🚀 BESONC dev mode (ts-node + tsconfig-paths, no compile needed)...');
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
