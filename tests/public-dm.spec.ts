import { expect, Page, test } from '@playwright/test';

type Conversation = {
  id: string;
  title: string;
  preview: string;
  pinned?: boolean;
  icon?: string;
  messages: { id: string; text: string; time: string }[];
};

function conversationFixtures(): Conversation[] {
  return [
    {
      id: 'pinned-1',
      title: 'pinned chat',
      preview: 'always on top',
      pinned: true,
      icon: 'rocket',
      messages: [
        { id: 'pm-1', text: 'Pinned message from admin', time: '2024-01-01T13:00:00.000Z' },
      ],
    },
    {
      id: 'recent-1',
      title: 'recent chat',
      preview: 'latest thread',
      messages: [
        { id: 'rc-1', text: 'Recent hello', time: '2024-01-04T09:05:00.000Z' },
      ],
    },
    {
      id: 'links-1',
      title: 'design thread',
      preview: 'portfolio links',
      messages: [
        { id: 'lk-1', text: 'Check https://example.com for more', time: '2024-01-03T10:00:00.000Z' },
        { id: 'lk-2', text: 'Later follow up', time: '2024-01-03T12:30:00.000Z' },
      ],
    },
  ];
}

async function stubConversations(page: Page) {
  const conversations = conversationFixtures();
  await page.route('**/api/conversations', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(conversations),
    }),
  );
}

async function captureContactRequests(page: Page) {
  const sent: any[] = [];
  await page.route('**/api/contact', async (route) => {
    const body = await route.request().postDataJSON();
    sent.push(body);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
  return sent;
}

test.describe('Public DM experience', () => {
  test('loads conversations, switches threads, and shows unlocked composer', async ({ page }) => {
    await stubConversations(page);
    await page.goto('/');

    const conversations = page.locator('.conversation');
    await expect(conversations.first()).toContainText('pinned chat');
    await expect(conversations.nth(1)).toContainText('recent chat');
    await expect(conversations.nth(2)).toContainText('design thread');

    await conversations.nth(2).click();
    await expect(page.locator('.thread-header .name')).toHaveText(/design thread/i);
    await expect(page.locator('.thread-header .handle')).toHaveText(/portfolio links/i);
    await expect(page.locator('a', { hasText: 'https://example.com' })).toBeVisible();
    await expect(page.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  test('sends a message without authentication', async ({ page }) => {
    await stubConversations(page);
    const sent = await captureContactRequests(page);

    await page.goto('/');

    const emailInput = page.getByPlaceholder(/you@example.com/i);
    await emailInput.fill('sender@example.com');
    const composer = page.getByPlaceholder(/message\.\.\./i);
    await composer.fill('A detailed message that should be sent.');
    const sendButton = page.getByRole('button', { name: /send/i });
    await expect(sendButton).toBeEnabled();
    await sendButton.click({ force: true });

    await expect(page.getByText(/sent\. i.*ll read it soon\./i)).toBeVisible();
    await expect(composer).toHaveValue('');
    expect(sent.at(-1)).toMatchObject({
      text: 'A detailed message that should be sent.',
      threadTitle: 'pinned chat',
    });
  });
});
