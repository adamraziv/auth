import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Environment Contract', () => {
  it('should include required secrets and URLs in .env.example', () => {
    const envPath = path.resolve(__dirname, '../.env.example');
    const content = fs.readFileSync(envPath, 'utf-8');
    
    expect(content).toContain('BETTER_AUTH_SECRET=');
    expect(content).toContain('BETTER_AUTH_URL=');
    expect(content).toContain('DATABASE_URL=');
    expect(content).toContain('GOOGLE_CLIENT_ID=');
    expect(content).toContain('GOOGLE_CLIENT_SECRET=');
  });
});
