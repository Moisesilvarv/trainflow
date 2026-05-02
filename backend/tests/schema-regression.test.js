import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testsDir, '../src/controllers');
const workspaceRoot = path.resolve(testsDir, '../..');

test('controllers de relatorios e inteligencia usam progress_records como schema oficial', async () => {
  const reportsSource = await fs.readFile(path.join(projectRoot, 'reportsController.js'), 'utf8');
  const intelligenceSource = await fs.readFile(path.join(projectRoot, 'intelligenceController.js'), 'utf8');

  assert.match(reportsSource, /progress_records/);
  assert.match(intelligenceSource, /progress_records/);
  assert.doesNotMatch(reportsSource, /\.from\('progress'\)/);
  assert.doesNotMatch(intelligenceSource, /\.from\('progress'\)/);
});

test('README oficial de migrations lista exatamente os arquivos versionados em database/migrations', async () => {
  const migrationsDir = path.join(workspaceRoot, 'database', 'migrations');
  const readmeSource = await fs.readFile(path.join(migrationsDir, 'README.md'), 'utf8');
  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  const documentedFiles = Array.from(readmeSource.matchAll(/`(\d{4}-\d{2}-\d{2}_[^`]+\.sql)`/g)).map((match) => match[1]);

  assert.deepEqual(documentedFiles, migrationFiles);
  assert.doesNotMatch(readmeSource, /20260429_trial_access\.sql/);
});

test('frontend publica fallback de SPA para Vercel e hosting estatico compativel com _redirects', async () => {
  const vercelConfig = await fs.readFile(path.join(workspaceRoot, 'frontend', 'vercel.json'), 'utf8');
  const redirectsConfig = await fs.readFile(path.join(workspaceRoot, 'frontend', 'public', '_redirects'), 'utf8');

  assert.match(vercelConfig, /"dest"\s*:\s*"\/index\.html"/);
  assert.match(redirectsConfig, /\/\*\s+\/index\.html\s+200/);
});
