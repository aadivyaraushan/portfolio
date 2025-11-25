import 'dotenv/config';
import { defineConfig } from '@playwright/test';

const ADMIN_BASIC_USER = process.env.ADMIN_BASIC_USER ?? 'admin';
const ADMIN_BASIC_PASS = process.env.ADMIN_BASIC_PASS ?? 'password';
const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET ?? 'test-secret-please-change';
const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3001';
const PORT = process.env.PORT ?? '3001';
const HOSTNAME = process.env.HOSTNAME ?? 'localhost';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: `http://${HOSTNAME}:${PORT}`,
    headless: true,
  },
  webServer: {
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
    },
  },
});
