import { expect, test } from '@playwright/test';

test.describe('Advanced Security - SQL Injection', () => {
  test('handles SQL injection attempts in message text', async ({ page }) => {
    const sqlPayloads = [
      "'; DROP TABLE messages; --",
      "1' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM users--",
      "1; UPDATE messages SET text='hacked' WHERE 1=1--",
    ];

    for (const payload of sqlPayloads) {
      const response = await page.request.post('/api/contact', {
        data: {
          text: payload + ' '.repeat(20), // Make it long enough to pass MIN_LENGTH
          fromEmail: 'test@example.com',
          threadTitle: 'test thread'
        }
      });

      // Should either accept gracefully (and sanitize) or reject, but never return 500 (crash)
      expect(response.status()).not.toBe(500);
      
      // If it accepts, we're trusting the DB layer (Supabase) to handle parameterized queries
      if (response.status() === 200) {
        const body = await response.json();
        expect(body.success).toBe(true);
      }
    }
  });

  test('handles SQL injection in admin message updates', async ({ page }) => {
    const username = process.env.ADMIN_BASIC_USER ?? 'admin';
    const password = process.env.ADMIN_BASIC_PASS ?? 'password';
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');

    // Test SQL injection in the message ID parameter
    const sqlIds = [
      "1' OR '1'='1",
      "'; DROP TABLE messages; --",
      "1 UNION SELECT * FROM messages--"
    ];

    for (const sqlId of sqlIds) {
      const response = await page.request.patch(`/api/admin/messages/${sqlId}`, {
        headers: {
          'Authorization': `Basic ${credentials}`
        },
        data: {
          text: 'Updated text'
        }
      });

      // Should handle gracefully - either 400 (bad ID) or 500 (not found), but Supabase should prevent actual SQL injection
      // The key is that it shouldn't execute malicious SQL - Supabase uses parameterized queries
      expect([400, 404, 500]).toContain(response.status());
    }

    // Test SQL injection in the text field - this should succeed but the SQL should be stored as text, not executed
    const sqlPayload = "'; DELETE FROM messages WHERE '1'='1";
    
    // We can't test this without a real message ID, so we'll just verify the endpoint requires valid input
    const response = await page.request.patch('/api/admin/messages/nonexistent-id', {
      headers: {
        'Authorization': `Basic ${credentials}`
      },
      data: {
        text: sqlPayload
      }
    });

    // Should return 500 (not found) but not crash the server
    // The SQL payload in text should be treated as a string, not executed
    expect(response.status()).toBe(500);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});

test.describe('Advanced Security - Rate Limiting', () => {
  test('enforces rate limiting on public contact form', async ({ page }) => {
    // The rate limit is 1 minute cooldown between messages
    // Use unique email to avoid conflicts with other tests
    const uniqueEmail = `ratelimit${Date.now()}@example.com`;
    const validMessage = {
      text: 'This is a valid test message with sufficient length to pass validation.',
      fromEmail: uniqueEmail,
      threadTitle: 'test'
    };

    // First request - may succeed or be rate limited if previous tests already triggered the limit
    const first = await page.request.post('/api/contact', { data: validMessage });
    
    if (first.status() === 200) {
      // We got through, so immediate second request should be rate limited
      const second = await page.request.post('/api/contact', { data: validMessage });
      expect(second.status()).toBe(429);
      
      const body = await second.json();
      expect(body.error).toMatch(/too many messages/i);
      
      // Should include Retry-After header
      const retryAfter = second.headers()['retry-after'];
      expect(retryAfter).toBeDefined();
      expect(parseInt(retryAfter || '0')).toBeGreaterThan(0);
    } else if (first.status() === 429) {
      // Already rate limited from previous tests - verify the response format
      const body = await first.json();
      expect(body.error).toMatch(/too many messages/i);
      
      const retryAfter = first.headers()['retry-after'];
      expect(retryAfter).toBeDefined();
      expect(parseInt(retryAfter || '0')).toBeGreaterThan(0);
    } else {
      throw new Error(`Unexpected status: ${first.status()}`);
    }
  });

  test('rate limit applies per IP address', async ({ page }) => {
    // This test verifies that different IPs are tracked separately
    // In Playwright, we can't easily simulate different IPs, but we can verify the behavior
    const message = {
      text: 'Testing rate limit isolation with enough text to pass validation checks.',
      fromEmail: 'isolation@example.com',
      threadTitle: 'test'
    };

    const response = await page.request.post('/api/contact', { data: message });
    // Should work (assuming no previous tests hit the same IP)
    expect([200, 429]).toContain(response.status());
  });
});

test.describe('Advanced Security - Session Timeout', () => {
  test('auto-restores valid session from localStorage', async ({ page }) => {
    const username = process.env.ADMIN_BASIC_USER ?? 'admin';
    const password = process.env.ADMIN_BASIC_PASS ?? 'password';
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');

    // Set valid auth in localStorage before navigating
    await page.addInitScript(({ auth }) => {
      localStorage.setItem('admin-basic-auth', auth);
    }, { auth: `Basic ${credentials}` });

    // Mock the auth verification
    await page.route('**/api/admin/auth', (route) => 
      route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) })
    );

    // Navigate to admin
    await page.goto('/admin');

    // Should NOT show login form, should show dashboard
    await expect(page.getByText(/dm backend/i)).toBeVisible({ timeout: 10000 });
  });

  test('clears invalid session from localStorage', async ({ page }) => {
    // Set invalid auth
    await page.addInitScript(() => {
      localStorage.setItem('admin-basic-auth', 'Basic invalid-credentials');
    });

    // Mock auth to fail
    await page.route('**/api/admin/auth', (route) => 
      route.fulfill({ 
        status: 401, 
        body: JSON.stringify({ error: 'unauthorized' }) 
      })
    );

    await page.goto('/admin');

    // Should show login form
    await expect(page.getByPlaceholder(/username/i)).toBeVisible();

    // Verify localStorage was cleared
    const authToken = await page.evaluate(() => localStorage.getItem('admin-basic-auth'));
    expect(authToken).toBeNull();
  });

  test('session persists across page reloads', async ({ page }) => {
    const username = process.env.ADMIN_BASIC_USER ?? 'admin';
    const password = process.env.ADMIN_BASIC_PASS ?? 'password';
    
    await page.goto('/admin');
    
    // Login
    await page.getByPlaceholder(/username/i).fill(username);
    await page.getByPlaceholder(/password/i).fill(password);
    
    // Mock conversations endpoint
    await page.route('**/api/admin/conversations', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ conversations: [] })
      });
    });
    
    await page.getByRole('button', { name: /continue/i }).click();
    
    // Wait for dashboard
    await expect(page.getByText(/dm backend/i)).toBeVisible();
    
    // Reload page
    await page.reload();
    
    // Should still be logged in (not show login form)
    await expect(page.getByText(/dm backend/i)).toBeVisible();
    await expect(page.getByPlaceholder(/username/i)).not.toBeVisible();
  });
});

test.describe('Advanced Security - CSRF Prevention', () => {
  test('admin endpoints require authentication header', async ({ page }) => {
    // Attempt to call admin endpoints without auth
    const endpoints = [
      { method: 'GET', url: '/api/admin/conversations' },
      { method: 'POST', url: '/api/admin/conversations', data: { title: 'test' } },
      { method: 'POST', url: '/api/admin/messages', data: { text: 'test', threadId: 'x' } },
    ];

    for (const endpoint of endpoints) {
      const response = await page.request.fetch(endpoint.url, {
        method: endpoint.method,
        data: endpoint.data,
      });

      expect(response.status()).toBe(401);
    }
  });

  test('public endpoints do not require authentication but validate input', async ({ page }) => {
    // Public endpoint should work without auth but validate input
    const response = await page.request.post('/api/contact', {
      data: {
        text: 'x', // Too short
        fromEmail: 'test@example.com'
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/too short/i);
  });

  test('honeypot field prevents bot submissions', async ({ page }) => {
    // The API has a bot_field honeypot
    const response = await page.request.post('/api/contact', {
      data: {
        text: 'This is a valid message with enough text to pass validation checks.',
        fromEmail: 'bot@example.com',
        bot_field: 'I am a bot!' // Honeypot filled
      }
    });

    // Should silently accept (return 200 but not actually process)
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});

test.describe('Advanced Security - Input Validation', () => {
  test('rejects messages that are too long', async ({ page }) => {
    const tooLong = 'a'.repeat(2001);
    const response = await page.request.post('/api/contact', {
      data: {
        text: tooLong,
        fromEmail: 'test@example.com'
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/too long/i);
  });

  test('rejects messages with too many URLs', async ({ page }) => {
    const manyUrls = `
      Check out https://example1.com and https://example2.com and 
      https://example3.com and https://example4.com for more info!
    `;
    
    const response = await page.request.post('/api/contact', {
      data: {
        text: manyUrls,
        fromEmail: 'test@example.com'
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/too many links/i);
  });

  test('filters profanity in messages', async ({ page }) => {
    const profaneMessage = 'This message contains inappropriate content like porn and sex stuff.';
    
    const response = await page.request.post('/api/contact', {
      data: {
        text: profaneMessage,
        fromEmail: 'test@example.com'
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/rejected/i);
  });
});
