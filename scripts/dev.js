#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * BESONC local development runner.
 *
 * Starts all Sprint 1-2 services in parallel:
 *   - API Gateway      (port 3000)
 *   - Auth Service     (port 3001)
 *   - User Service     (port 3002)
 *   - Customer BFF     (port 4000)
 *   - Customer Web     (port 4200)
 *
 * All run as child processes. Ctrl+C kills them all.
 */
const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist', 'apps');

const services = [
  { name: 'api-gateway',  cmd: 'node', args: [`${dist}/api-gateway/apps/api-gateway/src/main.js`], env: { PORT: '3000' } },
  { name: 'auth-service', cmd: 'node', args: [`${dist}/auth-service/apps/auth-service/src/main.js`], env: { PORT: '3001' } },
  { name: 'user-service', cmd: 'node', args: [`${dist}/user-service/apps/user-service/src/main.js`], env: { PORT: '3002' } },
  { name: 'customer-bff', cmd: 'node', args: [`${dist}/customer-bff/apps/customer-bff/src/main.js`], env: { PORT: '4000' } },
  { name: 'customer-web', cmd: 'pnpm', args: ['exec', 'nx', 'start', 'customer-web'], env: { PORT: '4200' } },
];

const procs = services.map(({ name, cmd, args, env }) => {
  const proc = spawn(cmd, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const prefix = `[${name}]`;
  proc.stdout.on('data', (data) => process.stdout.write(data.toString().split('\n').map((l) => l ? `${prefix} ${l}` : '').join('\n') + '\n'));
  proc.stderr.on('data', (data) => process.stderr.write(data.toString().split('\n').map((l) => l ? `${prefix} ${l}` : '').join('\n') + '\n'));
  proc.on('exit', (code) => console.log(`${prefix} exited with code ${code}`));
  return proc;
});

console.log('\n🚀 BESONC dev mode — Sprint 1-2 services starting...');
console.log('   Customer Web:    http://localhost:4200');
console.log('   API Gateway:     http://localhost:3000/api/v1');
console.log('   Auth Service:    http://localhost:3001/auth');
console.log('   User Service:    http://localhost:3002/users');
console.log('   Customer BFF:    http://localhost:4000/bff/customer');
console.log('   Press Ctrl+C to stop all services.\n');

const shutdown = () => {
  console.log('\nShutting down...');
  procs.forEach((p) => p.kill('SIGTERM'));
  setTimeout(() => process.exit(0), 2000);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
