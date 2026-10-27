/**
 * Runs the API and the Vite dev server together, so `npm run dev` is still a
 * single command now that the app has a backend. Either process exiting takes
 * the other down, so there are no orphans after Ctrl+C.
 */

import { spawn } from 'node:child_process';

const processes = [
  { name: 'api', color: '\u001b[36m', command: 'npx', args: ['tsx', 'watch', '--clear-screen=false', '--disable-warning=ExperimentalWarning', 'server/index.ts'] },
  { name: 'web', color: '\u001b[35m', command: 'npx', args: ['vite'] },
];

const children = processes.map(({ name, color, command, args }) => {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
  const prefix = `${color}[${name}]\u001b[0m `;

  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      const lines = chunk.replace(/\s+$/, '').split('\n');
      for (const line of lines) process.stdout.write(prefix + line + '\n');
    });
  }

  child.on('exit', (code) => {
    process.stdout.write(`${prefix}exited with code ${code}\n`);
    shutdown(code ?? 0);
  });

  return child;
});

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill('SIGTERM');
  process.exit(code);
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => shutdown(0));
