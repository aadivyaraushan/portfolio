import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const RESEND_FROM = 'inbox@aadivya.net';
const resendApiKey = process.env.RESEND_API_KEY;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { to, subject, text, fromEmail } = body || {};

  if (!to || !subject || !text) {
    return NextResponse.json(
      { error: 'to, subject, and text are required' },
      { status: 400 }
    );
  }

  if (!resendClient) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY not configured' },
      { status: 500 }
    );
  }

  const senderEmail = typeof fromEmail === 'string' ? fromEmail.trim() : '';
  if (!senderEmail) {
    return NextResponse.json(
      { error: 'fromEmail is required to send a message' },
      { status: 400 }
    );
  }
  const textBody = [`From: ${senderEmail}`, '', text].join('\n');

  const { data, error } = await resendClient.emails.send({
    from: RESEND_FROM,
    to,
    subject,
    text: textBody,
    reply_to: senderEmail || undefined,
  });

  if (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to send via Resend';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data?.id });
}
