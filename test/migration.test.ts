import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Migration Configuration', () => {
  it('should define a migration command targeting the exact auth config path', () => {
    const pkgPath = path.resolve(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    
    const migrateCmd = pkg.scripts['auth:migrate'];
    expect(migrateCmd).toBeDefined();
    expect(migrateCmd).toContain('--config ./src/lib/auth.ts');
  });

  it('should expose a valid Better Auth instance for the CLI to import', async () => {
    // We mock pg in other tests, but since this test runs in isolation, pg is not mocked here.
    // However, importing it doesn't connect to the DB immediately, so it shouldn't throw.
    // But env.ts WILL throw if variables are missing. We provided them in vitest.config.ts!
    const module = await import('../src/lib/auth.js');
    
    expect(module.auth).toBeDefined();
    expect(module.auth.options.database).toBeDefined();
  });
});
