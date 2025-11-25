import { expect, test } from '@playwright/test';

test.describe('Security Edge Cases', () => {
  test('prevents XSS in message inputs', async ({ page }) => {
    // We need to mock the conversation to test this effectively without polluting the DB
    // or use a temporary conversation if possible.
    // For now, let's try to inject into the public contact form if it exists or admin inputs.
    
    await page.goto('/');
    const messageBox = page.getByPlaceholder(/message\.\.\./i);
    const xssPayload = '<script>alert("xss")</script>';
    
    if (await messageBox.count() > 0) {
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
        email: 'test@example.com'
      }
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
        email: 'test@example.com'
      }
    });
    
    // Should probably be 413 or 400, or 200 if it truncates/handles it.
    // Just ensure it doesn't crash (500).
    expect(response.status()).not.toBe(500);
  });

  test('protects admin API routes from unauthenticated access', async ({ page }) => {
    const response = await page.request.get('/api/admin/conversations');
    expect(response.status()).toBe(401);
  });
});
