import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import MessagesApp from '@/components/messages/MessagesApp';
import type { Thread } from '@/lib/threads/types';

jest.mock('@vercel/analytics/react', () => ({ track: jest.fn() }));

const threads: Thread[] = [
  {
    id: 'about',
    title: 'about me',
    tagline: 'identities',
    pinned: true,
    icon: { src: 'https://cdn.example/bust.png', alt: '👤' },
    messages: [
      { id: 'a1', text: "Hi! I'm Aadivya.\n\nCheck https://example.com/work for more.", sentAt: '2025-11-26T10:00:00.000Z', attachment: null },
    ],
  },
  {
    id: 'resume',
    title: 'resume',
    tagline: 'for anything professional',
    pinned: false,
    icon: null,
    messages: [
      {
        id: 'r1',
        text: 'Here is my resume:',
        sentAt: '2025-11-20T10:00:00.000Z',
        attachment: { url: 'https://cdn.example/r.pdf', kind: 'file', name: 'Resume.pdf' },
      },
    ],
  },
  {
    id: 'music',
    title: 'fav artists/music',
    tagline: 'stuff i have on repeat',
    pinned: false,
    icon: null,
    messages: [{ id: 'm1', text: 'Fav albums: Currents', sentAt: '2025-11-27T10:00:00.000Z', attachment: null }],
  },
];

const thread = () => screen.getByRole('region', { name: /conversation/i });
const list = () => screen.getByRole('navigation', { name: /conversations/i });

function mockFetch(response: { status: number; headers?: Record<string, string> }) {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    headers: { get: (name: string) => response.headers?.[name] ?? null },
    json: async () => ({}),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

async function send(text: string, email = 'visitor@example.com') {
  fireEvent.change(screen.getByLabelText(/your email/i), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText('iMessage'), { target: { value: text } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));
  });
}

describe('MessagesApp', () => {
  it('shows every thread in the list and opens the first pinned thread', () => {
    render(<MessagesApp threads={threads} />);
    expect(within(list()).getAllByText('about me').length).toBeGreaterThan(0);
    expect(within(list()).getByText('resume')).toBeInTheDocument();
    expect(within(thread()).getByRole('heading', { name: 'about me' })).toBeInTheDocument();
    expect(within(thread()).getByText(/Hi! I'm Aadivya\./)).toBeInTheDocument();
  });

  it('shows the whole message in one bubble and renders links as safe anchors', () => {
    render(<MessagesApp threads={threads} />);
    const link = within(thread()).getByRole('link', { name: 'example.com/work' });
    expect(link).toHaveAttribute('href', 'https://example.com/work');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(within(thread()).getAllByTestId('bubble')).toHaveLength(1);
  });

  it('switches thread when you select a conversation', () => {
    render(<MessagesApp threads={threads} />);
    fireEvent.click(within(list()).getByRole('button', { name: /resume/i }));
    expect(within(thread()).getByRole('heading', { name: 'resume' })).toBeInTheDocument();
    const file = within(thread()).getByRole('link', { name: /Resume\.pdf/ });
    expect(file).toHaveAttribute('href', 'https://cdn.example/r.pdf');
  });

  it('filters the list by title or message text, and says when nothing matches', () => {
    render(<MessagesApp threads={threads} />);
    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: 'currents' } });
    expect(within(list()).getByText('fav artists/music')).toBeInTheDocument();
    expect(within(list()).queryByText('resume')).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(within(list()).getByText(/no results/i)).toBeInTheDocument();
  });

  it('tells the visitor what is missing instead of sending', async () => {
    const fetchMock = mockFetch({ status: 200 });
    render(<MessagesApp threads={threads} />);
    await send('A long enough message here', '');
    expect(screen.getByRole('status')).toHaveTextContent(/add your email/i);
    await send('too short');
    expect(screen.getByRole('status')).toHaveTextContent(/at least 10 characters/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends to /api/contact and shows the message as a delivered blue bubble', async () => {
    const fetchMock = mockFetch({ status: 200 });
    render(<MessagesApp threads={threads} />);
    await send('Loved your projects, want to chat?');
    expect(fetchMock).toHaveBeenCalledWith('/api/contact', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      text: 'Loved your projects, want to chat?',
      threadTitle: 'about me',
      fromEmail: 'visitor@example.com',
      bot_field: '',
    });
    const sent = within(thread()).getByText('Loved your projects, want to chat?');
    expect(sent.closest('[data-from]')).toHaveAttribute('data-from', 'visitor');
    expect(within(thread()).getByText('Delivered')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('iMessage')).toHaveValue('');
  });

  it('marks a failed send as Not Delivered and keeps the text for a retry', async () => {
    mockFetch({ status: 500 });
    render(<MessagesApp threads={threads} />);
    await send('This one will fail to send');
    expect(within(thread()).getByText(/not delivered/i)).toBeInTheDocument();
    mockFetch({ status: 200 });
    await act(async () => {
      fireEvent.click(within(thread()).getByRole('button', { name: /try again/i }));
    });
    expect(within(thread()).getByText('Delivered')).toBeInTheDocument();
  });

  it('shows the wait time when the server rate-limits the visitor', async () => {
    mockFetch({ status: 429, headers: { 'Retry-After': '7' } });
    render(<MessagesApp threads={threads} />);
    await send('Sending a second message too fast');
    expect(within(thread()).getByText(/not delivered/i)).toBeInTheDocument();
    expect(within(thread()).getByText(/try again in 7s/i)).toBeInTheDocument();
  });

  it('on phones, goes back to the list and opens a thread from it', () => {
    const { container } = render(<MessagesApp threads={threads} />);
    const app = container.querySelector('[data-view]');
    expect(app).toHaveAttribute('data-view', 'thread');
    fireEvent.click(within(thread()).getByRole('button', { name: /all conversations/i }));
    expect(app).toHaveAttribute('data-view', 'list');
    fireEvent.click(within(list()).getByRole('button', { name: /fav artists/i }));
    expect(app).toHaveAttribute('data-view', 'thread');
  });
});
