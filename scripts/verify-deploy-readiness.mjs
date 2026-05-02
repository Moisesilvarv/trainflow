import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');

async function read(filePath) {
  return fs.readFile(path.join(rootDir, filePath), 'utf8');
}

async function verifyMigrationsReadme() {
  const migrationsDir = path.join(rootDir, 'database', 'migrations');
  const readmeSource = await fs.readFile(path.join(migrationsDir, 'README.md'), 'utf8');
  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  const documentedFiles = Array.from(readmeSource.matchAll(/`(\d{4}-\d{2}-\d{2}_[^`]+\.sql)`/g)).map((match) => match[1]);

  assert.deepEqual(
    documentedFiles,
    migrationFiles,
    'database/migrations/README.md precisa listar exatamente as migrations versionadas.'
  );
  assert.doesNotMatch(
    readmeSource,
    /20260429_trial_access\.sql/,
    'database/migrations/README.md nao deve referenciar a migration legacy 20260429_trial_access.sql.'
  );
}

async function verifySpaRewriteDocsAndConfigs() {
  const rootReadme = await read('README.md');
  const deployGuide = await read('docs/database_deploy.md');
  const vercelConfig = await read('frontend/vercel.json');
  const redirectsConfig = await read('frontend/public/_redirects');

  assert.match(rootReadme, /rewrite SPA para `index\.html`/);
  assert.match(rootReadme, /\/login`, `\/register`, `\/dashboard`/);
  assert.match(deployGuide, /Frontend SPA rewrite/);
  assert.match(vercelConfig, /"dest"\s*:\s*"\/index\.html"/);
  assert.match(redirectsConfig, /\/\*\s+\/index\.html\s+200/);
}

async function verifyHealthMonitoringDocs() {
  const rootReadme = await read('README.md');
  const deployGuide = await read('docs/database_deploy.md');

  assert.match(rootReadme, /latencia do banco/i);
  assert.match(deployGuide, /GET \/health.*latencia de banco/i);
}

await verifyMigrationsReadme();
await verifySpaRewriteDocsAndConfigs();
await verifyHealthMonitoringDocs();

console.log('Deploy readiness docs/config checks passed.');
