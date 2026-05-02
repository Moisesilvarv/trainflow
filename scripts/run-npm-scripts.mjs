import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , projectDir, ...scripts] = process.argv;

if (!projectDir || scripts.length === 0) {
  console.error('Usage: node scripts/run-npm-scripts.mjs <dir> <script> [script...]');
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const cwd = path.join(rootDir, projectDir);
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

for (const scriptName of scripts) {
  const result = spawnSync(npmCommand, ['run', scriptName], {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
