import { planThreadCopy } from '../../../scripts/content/planThreadCopy';

const threads = [
  { id: 't1', title: 'about me' },
  { id: 't2', title: 'resume' },
  { id: 't3', title: 'not in copy' },
];
const messages = [
  { id: 'a', thread_id: 't1', text: 'hi!', created_at: '2025-11-17T00:00:00Z' },
  { id: 'c', thread_id: 't1', text: 'check out...', created_at: '2025-11-26T00:00:00Z' },
  { id: 'b', thread_id: 't1', text: "i'm 18", created_at: '2025-11-18T00:00:00Z' },
  { id: 'r', thread_id: 't2', text: 'resume:', created_at: '2025-11-01T00:00:00Z', attachment_url: 'https://x/r.pdf' },
  { id: 'r2', thread_id: 't2', text: 'later note', created_at: '2025-11-02T00:00:00Z' },
];

describe('planThreadCopy', () => {
  it('keeps the newest message, rewrites it, and deletes the rest', () => {
    const plan = planThreadCopy(threads, messages, { t1: { title: 'about me', text: "Hi! I'm Aadivya." } });
    expect(plan.threads[0]).toEqual({
      threadId: 't1',
      title: 'about me',
      keepId: 'c',
      deleteIds: ['a', 'b'],
      text: "Hi! I'm Aadivya.",
      changed: true,
    });
  });

  it('keeps the message with the attachment so the file is not lost', () => {
    const plan = planThreadCopy(threads, messages, { t2: { title: 'resume', text: 'Resume:' } });
    expect(plan.threads[0]).toMatchObject({ keepId: 'r', deleteIds: ['r2'] });
  });

  it('reports no change when the thread already has the one new message (safe to run twice)', () => {
    const plan = planThreadCopy(
      threads,
      [{ id: 'c', thread_id: 't1', text: 'New', created_at: '2025-11-26T00:00:00Z' }],
      { t1: { title: 'about me', text: 'New' } },
    );
    expect(plan.threads[0].changed).toBe(false);
  });

  it('lists copy entries with no thread, and threads with no copy', () => {
    const plan = planThreadCopy(threads, messages, { gone: { title: 'old', text: 'x' }, t1: { title: 'about me', text: 'y' } });
    expect(plan.missingInDb).toEqual(['gone']);
    expect(plan.notInCopy).toEqual(['resume', 'not in copy']);
  });

  it('refuses a thread with more than one attachment, so no file is deleted', () => {
    const twoFiles = [
      ...messages,
      { id: 'r3', thread_id: 't2', text: 'cover letter', created_at: '2025-11-03T00:00:00Z', attachment_url: 'https://x/c.pdf' },
    ];
    expect(() => planThreadCopy(threads, twoFiles, { t2: { title: 'resume', text: 'Resume:' } })).toThrow(
      /resume.*2 attachments/,
    );
  });
});
