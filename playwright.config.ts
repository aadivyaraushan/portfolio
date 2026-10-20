import 'dotenv/config';
import { defineConfig } from '@playwright/test';

const ADMIN_BASIC_USER = process.env.ADMIN_BASIC_USER ?? 'admin';
const ADMIN_BASIC_PASS = process.env.ADMIN_BASIC_PASS ?? 'password';
const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET ?? 'test-secret-please-change';
const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3001';
const PORT = process.env.PORT ?? '3001';
const HOSTNAME = process.env.HOSTNAME ?? 'localhost';
// The public page reads Supabase on the server, so tests point it at a local fake.
const MOCK_SUPABASE_PORT = process.env.MOCK_SUPABASE_PORT ?? '54329';
export const MOCK_SUPABASE_URL = `http://localhost:${MOCK_SUPABASE_PORT}`;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  // One worker: every test shares the one fake Supabase server and its fixture.
  workers: 1,
  use: {
    baseURL: `http://${HOSTNAME}:${PORT}`,
    headless: true,
  },
  webServer: [
    {
      command: 'node scripts/testing/mock-supabase.mjs',
      url: `${MOCK_SUPABASE_URL}/rest/v1/threads`,
      reuseExistingServer: !process.env.CI,
      env: { MOCK_SUPABASE_PORT },
    },
    {
    command: `npm run dev -- --hostname ${HOSTNAME} --port ${PORT}`,
    url: `http://${HOSTNAME}:${PORT}`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      ADMIN_BASIC_USER,
      ADMIN_BASIC_PASS,
      NEXTAUTH_SECRET,
      NEXTAUTH_URL,
      PORT,
      HOSTNAME,
      NEXT_PUBLIC_SUPABASE_URL: MOCK_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: 'mock-service-key',
    },
    },
  ],
});
