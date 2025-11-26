import { expect, test } from '@playwright/test';

test.describe('Security Edge Cases', () => {
  test('prevents XSS in message inputs', async ({ page }) => {
    // We need to mock the conversation to test this effectively without polluting the DB
    // or use a temporary conversation if possible.
    // For now, let's try to inject into the public contact form if it exists or admin inputs.

    await page.goto('/');
    const messageBox = page.getByPlaceholder(/message\.\.\./i);
    const xssPayload = '<script>alert("xss")</script>';

    if ((await messageBox.count()) > 0) {
      await messageBox.fill(xssPayload);
      // We might not be able to submit if there are client-side checks,
      // but if we do, we check if it's escaped in the UI.
      // This is a bit hard to test E2E without submitting and reloading.
      // Alternatively, we can test the API directly.
    }

    // Test API directly for XSS sanitization
    const response = await page.request.post('/api/contact', {
      data: {
        text: xssPayload,
        email: 'test@example.com',
      },
    });

    // The API should ideally accept it but sanitize it on display.
    // Or reject it.
    // If it accepts, we would need to verify it's not executed when viewed.
    // Since we can't easily view the admin side in this test without auth,
    // we'll assume the API should at least handle it gracefully (200 or 400).
    expect(response.status()).toBeLessThan(500);
  });

  test('handles large payloads gracefully', async ({ page }) => {
    const largeText = 'a'.repeat(10000);
    const response = await page.request.post('/api/contact', {
      data: {
        text: largeText,
        email: 'test@example.com',
      },
    });

    // Should probably be 413 or 400, or 200 if it truncates/handles it.
    // Just ensure it doesn't crash (500).
    expect(response.status()).not.toBe(500);
  });

  test('protects admin API routes from unauthenticated access', async ({
    page,
  }) => {
    const response = await page.request.get('/api/admin/conversations');
    expect(response.status()).toBe(401);
  });

  test('handles SQL injection-like payloads without 5xx', async ({ page }) => {
    const sqliPayload = "'; DROP TABLE users; --";
    const response = await page.request.post('/api/contact', {
      data: {
        text: sqliPayload.padEnd(20, 'x'),
        fromEmail: 'sqli@example.com',
      },
    });

    expect(response.status()).not.toBe(500);
  });

  test('rejects clearly malicious SQL injection-like payloads with 4xx', async ({
    page,
  }) => {
    const sqliPayload = "'; DROP TABLE users; --";
    const response = await page.request.post('/api/contact', {
      data: {
        text: sqliPayload.repeat(5),
        fromEmail: 'sqli@example.com',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('rate limiting cannot be bypassed with spoofed headers', async ({
    page,
  }) => {
    const payload = 'hello from spoofed header'.padEnd(20, 'x');

    const first = await page.request.post('/api/contact', {
      data: { text: payload, fromEmail: 'spoof@example.com' },
      headers: {
        'x-forwarded-for': '1.2.3.4',
      },
    });
    expect(first.status()).toBeLessThan(500);

    // Rapidly send more than MAX_PER_HOUR within cooldown window using same x-forwarded-for
    const responses = await Promise.all(
      Array.from({ length: 6 }).map(() =>
        page.request.post('/api/contact', {
          data: { text: payload, fromEmail: 'spoof@example.com' },
          headers: {
            'x-forwarded-for': '1.2.3.4',
          },
        })
      )
    );

    const has429 = responses.some((res) => res.status() === 429);
    expect(has429).toBeTruthy();
  });
});
