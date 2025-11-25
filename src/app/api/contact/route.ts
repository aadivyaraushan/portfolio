import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;
const MAX_URLS = 3;
const COOLDOWN_MS = 60_000; // 1 minute between sends
const MAX_PER_HOUR = 5;
const EMAIL_TO = process.env.EMAIL_TO;

const RESEND_FROM = 'inbox@aadivya.net';
const resendApiKey = process.env.RESEND_API_KEY;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

type RateEntry = { count: number; first: number; last: number };
const rateMap = new Map<string, RateEntry>();

function tooManyUrls(text: string) {
  const urls = text.match(/https?:\/\/\S+/g) || [];
  return urls.length > MAX_URLS;
}

function isProfane(text: string) {
  const badWords = ['sex', 'porn']; // simple heuristic
  const lower = text.toLowerCase();
  return badWords.some((w) => lower.includes(w));
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry) {
    rateMap.set(ip, { count: 1, first: now, last: now });
    return { allowed: true };
  }
  if (now - entry.last < COOLDOWN_MS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((COOLDOWN_MS - (now - entry.last)) / 1000),
    };
  }
  if (now - entry.first > 60 * 60 * 1000) {
    rateMap.set(ip, { count: 1, first: now, last: now });
    return { allowed: true };
  }
  if (entry.count >= MAX_PER_HOUR) {
    return { allowed: false, retryAfter: 60 * 60 };
  }
  rateMap.set(ip, { count: entry.count + 1, first: entry.first, last: now });
  return { allowed: true };
}

async function sendViaResend(options: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string | null;
}) {
  if (!EMAIL_TO) {
    console.warn('EMAIL_TO not set; skipping email send');
    return { sent: false, skipped: true, reason: 'missing EMAIL_TO' };
  }
  if (!resendClient) {
    console.warn('RESEND_API_KEY not set; skipping email send');
    return { sent: false, skipped: true, reason: 'missing RESEND_API_KEY' };
  }

  const { data, error } = await resendClient.emails.send({
    from: RESEND_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    replyTo: options.replyTo || undefined,
  });

  if (error) {
    console.error('Resend failed to send message', error);
    return { sent: false, skipped: false, reason: 'send failed' };
  }

  return { sent: true, skipped: false, id: data?.id };
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const body = await req.json();
  const {
    text,
    bot_field: botField,
    threadTitle,
    fromEmail,
  } = body ?? {};

  if (botField) {
    return NextResponse.json({ success: true });
  }

  if (!text || typeof text !== 'string') {
    return NextResponse.json(
      { error: 'message text is required' },
      { status: 400 }
    );
  }
  const trimmed = text.trim();
  if (trimmed.length < MIN_LENGTH) {
    return NextResponse.json({ error: 'message too short' }, { status: 400 });
  }
  if (trimmed.length > MAX_LENGTH) {
    return NextResponse.json({ error: 'message too long' }, { status: 400 });
  }
  if (tooManyUrls(trimmed)) {
    return NextResponse.json(
      { error: 'too many links in message' },
      { status: 400 }
    );
  }
  if (isProfane(trimmed)) {
    return NextResponse.json({ error: 'message rejected' }, { status: 400 });
  }

  const senderEmail =
    typeof fromEmail === 'string' ? fromEmail.trim() : '';
  if (!senderEmail) {
    return NextResponse.json(
      { error: 'fromEmail is required to send a message' },
      { status: 400 }
    );
  }

  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'too many messages, slow down' },
      {
        status: 429,
        headers: rate.retryAfter
          ? { 'Retry-After': rate.retryAfter.toString() }
          : {},
      }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const normalizedTitle = (threadTitle ?? '').trim().toLowerCase();

    let threadId: string | null = null;
    if (normalizedTitle) {
      const { data: thread } = await supabase
        .from('threads')
        .select('id')
        .eq('title', normalizedTitle)
        .maybeSingle();
      threadId = thread?.id ?? null;
    }

    if (!threadId) {
      const { data: fallback } = await supabase
        .from('threads')
        .select('id')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      threadId = fallback?.id ?? null;
    }

    if (!threadId) {
      return NextResponse.json(
        { error: 'No threads available to store this message' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({ thread_id: threadId, text: trimmed })
      .select('id, created_at')
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? 'failed to save message' },
        { status: 500 }
      );
    }

    // Send via Resend using a shared inbox and reply-to set to the user's email.
    const subject = threadTitle
      ? `[portfolio] New message in "${threadTitle}"`
      : '[portfolio] New message';
    const textBody = [
      `Thread: ${threadTitle || 'unknown'}`,
      `From: ${senderEmail}`,
      '',
      trimmed,
    ].join('\n');

    void sendViaResend({
      to: EMAIL_TO as string,
      subject,
      text: textBody,
      replyTo: senderEmail || null,
    });

    return NextResponse.json({
      success: true,
      messageId: data.id,
      storedAt: data.created_at ?? new Date().toISOString(),
    });
  } catch (err) {
    console.error('contact route failed to send message', err);
    const message =
      err instanceof Error ? err.message : 'failed to send message';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
