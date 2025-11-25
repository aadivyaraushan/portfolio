// Build a URL-safe Base64 message body for Gmail API.
export function buildGmailRawMessage(params: {
  from: string;
  to: string;
  subject: string;
  text: string;
}) {
  const { from, to, subject, text } = params;
  if (!from || !to) throw new Error('Missing from/to for gmail send');
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    '',
    text,
  ];
  const message = lines.join('\r\n');
  const base64 = Buffer.from(message).toString('base64');
  // Gmail API expects URL-safe base64
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendGmailWithToken(options: {
  accessToken: string;
  raw: string;
}) {
  const { accessToken, raw } = options;
  const res = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ raw }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gmail send failed: ${res.status} ${res.statusText} ${text}`);
  }

  return res.json() as Promise<{ id: string }>;
}

export async function refreshGoogleAccessToken(input: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}) {
  const { refreshToken, clientId, clientSecret } = input;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Failed to refresh Google token: ${res.status} ${res.statusText} ${text}`
    );
  }

  return res.json() as Promise<{
    access_token: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  }>;
}
