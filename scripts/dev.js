#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const services = [
  { name: 'backend', color: '\x1b[36m', dir: path.join(rootDir, 'backend'), cmd: 'npm', args: ['run', 'dev'] },
  { name: 'web    ', color: '\x1b[32m', dir: path.join(rootDir, 'web'), cmd: 'npm', args: ['run', 'dev'] },
  { name: 'admin  ', color: '\x1b[35m', dir: path.join(rootDir, 'admin-client'), cmd: 'npm', args: ['run', 'dev'] },
];

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

console.log(`${BOLD}🚀 Starting Self Introduction Portal Services (Combined Dev Mode)...${RESET}\n`);

const children = [];

function pipeOutput(child, name, color) {
  const prefix = `${color}[${name}]${RESET} `;

  function handleData(data) {
    const lines = data.toString().split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === lines.length - 1 && line === '') continue;
      process.stdout.write(`${prefix}${line}\n`);
    }
  }

  child.stdout?.on('data', handleData);
  child.stderr?.on('data', handleData);
}

for (const svc of services) {
  const child = spawn(svc.cmd, svc.args, {
    cwd: svc.dir,
    env: process.env,
    shell: true,
  });

  pipeOutput(child, svc.name, svc.color);

  child.on('exit', (code, signal) => {
    if (signal !== 'SIGINT' && signal !== 'SIGTERM') {
      console.log(`${svc.color}[${svc.name}]${RESET} exited with code ${code ?? signal}`);
    }
  });

  children.push(child);
}

function cleanup() {
  console.log(`\n${DIM}Shutting down all services...${RESET}`);
  for (const child of children) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', child.pid, '/f', '/t']);
      } else {
        process.kill(-child.pid, 'SIGINT');
      }
    } catch {
      try {
        child.kill('SIGINT');
      } catch {
        /* ignore */
      }
    }
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
