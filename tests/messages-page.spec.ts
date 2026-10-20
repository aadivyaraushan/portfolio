import { expect, Page, test } from '@playwright/test';
import { MOCK_SUPABASE_URL } from '../playwright.config';

async function mockSupabase(path: '__reset' | '__fail' | '__fixture', body?: unknown) {
  const res = await fetch(`${MOCK_SUPABASE_URL}/${path}`, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  expect(res.ok).toBe(true);
}

async function stubContact(page: Page, status: number, headers: Record<string, string> = {}) {
  const sent: Array<Record<string, unknown>> = [];
  await page.route('**/api/contact', async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ status, headers, contentType: 'application/json', body: '{}' });
  });
  return sent;
}

const list = (page: Page) => page.getByRole('navigation', { name: 'Conversations' });
const thread = (page: Page) => page.getByRole('region', { name: 'Conversation' });

test.beforeEach(async () => {
  await mockSupabase('__reset');
});

test.describe('Messages page', () => {
  test('ships the messages inside the first HTML response, with no data request after load', async ({ page, request }) => {
    const html = await (await request.get('/')).text();
    expect(html).toContain('from the fixture');
    expect(html).not.toContain('emojis":{'); // the emoji name table stays on the server

    const dataRequests: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/conversations')) dataRequests.push(r.url());
    });
    await page.goto('/');
    await expect(thread(page).getByText(/from the fixture/)).toBeVisible();
    expect(dataRequests).toEqual([]);
  });

  test('lists pinned threads first, then the rest by newest message', async ({ page }) => {
    await page.goto('/');
    await expect(list(page).locator('.pinned__name')).toHaveText(['about me', 'projects']);
    await expect(list(page).locator('.row__title')).toHaveText(['now', 'resume', 'older thread']);
  });

  test('opens a thread from the list and renders links and files', async ({ page }) => {
    await page.goto('/');
    await list(page).getByRole('button', { name: /projects/ }).click();
    await expect(thread(page).getByRole('heading', { name: 'projects' })).toBeVisible();
    await expect(thread(page).getByRole('link', { name: 'example.com/lessongpt' })).toHaveAttribute(
      'href',
      'https://example.com/lessongpt',
    );
    await list(page).getByRole('button', { name: /resume/ }).click();
    await expect(thread(page).getByRole('link', { name: /Resume\.pdf/ })).toBeVisible();
  });

  test('sends a message and shows it as Delivered', async ({ page }) => {
    const sent = await stubContact(page, 200);
    await page.goto('/');
    await page.getByLabel('Your email').fill('sender@example.com');
    await page.getByPlaceholder('iMessage').fill('A detailed message that should be sent.');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(thread(page).getByText('Delivered', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('iMessage')).toHaveValue('');
    expect(sent.at(-1)).toMatchObject({
      text: 'A detailed message that should be sent.',
      threadTitle: 'about me',
      fromEmail: 'sender@example.com',
    });
  });

  test('shows Not Delivered and the wait time when rate-limited', async ({ page }) => {
    await stubContact(page, 429, { 'Retry-After': '7' });
    await page.goto('/');
    await page.getByLabel('Your email').fill('sender@example.com');
    await page.getByPlaceholder('iMessage').fill('This is a long enough message.');
    await page.keyboard.press('Enter');
    await expect(thread(page).getByText('Not Delivered')).toBeVisible();
    await expect(thread(page).getByText('Try again in 7s')).toBeVisible();
  });

  test('on a phone, shows one pane at a time with a back button', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(thread(page)).toBeVisible();
    await expect(list(page)).toBeHidden();
    await page.getByRole('button', { name: 'All conversations' }).click();
    await expect(list(page)).toBeVisible();
    await expect(thread(page)).toBeHidden();
    await list(page).getByRole('button', { name: /now/ }).click();
    await expect(thread(page).getByRole('heading', { name: 'now' })).toBeVisible();
  });

  test('text fields have no browser outline, but keyboard users still see which field has focus', async ({ page }) => {
    await page.goto('/');
    const box = page.locator('.composer__field');
    const before = await box.evaluate((el) => getComputedStyle(el).borderColor);
    const fromLabel = page.locator('.composer__from');
    const labelBefore = await fromLabel.evaluate((el) => getComputedStyle(el).color);
    for (const field of [page.getByPlaceholder('iMessage'), page.getByLabel('Your email'), page.getByPlaceholder('Search')]) {
      await field.focus();
      await expect(field).toHaveCSS('outline-style', 'none');
    }
    await page.getByPlaceholder('iMessage').focus();
    await expect(box).not.toHaveCSS('border-color', before);
    await page.getByLabel('Your email').focus();
    await expect(fromLabel).not.toHaveCSS('color', labelBefore);
  });

  test('on a phone, the list does not mark the open thread as selected', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'All conversations' }).click();
    const pinnedAbout = list(page).locator('.pinned__item[aria-current="true"]');
    await expect(pinnedAbout).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  });

  test('the public site exposes no unauthenticated write or email routes', async ({ request }) => {
    const calls = [
      request.post('/api/conversations/messages', { data: { threadId: 't', text: 'x' } }),
      request.delete('/api/conversations/messages/t/m'),
      request.post('/api/conversations/threads', { data: { title: 'x' } }),
      request.post('/api/gmail/send', { data: { to: 'x@example.com', subject: 'x', text: 'x' } }),
    ];
    for (const res of await Promise.all(calls)) expect(res.status()).toBe(404);
  });

  test('shows a retry screen when Supabase fails, and Try Again loads the messages once it is back', async ({ page }) => {
    await mockSupabase('__fail');
    await page.goto('/');
    await expect(page.getByText('Messages could not load.')).toBeVisible();
    await mockSupabase('__reset');
    await page.getByRole('button', { name: 'Try Again' }).click();
    await expect(thread(page).getByRole('heading', { name: 'about me' })).toBeVisible();
  });
});
