import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Common disposable/throwaway email providers. Not exhaustive — new ones
// appear constantly — but blocks the casual case cheaply.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.info',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'yopmail.com',
  'trashmail.com',
  'getnada.com',
  'maildrop.cc',
  'fakeinbox.com',
  'sharklasers.com',
  'mailnesia.com',
  'dispostable.com',
  'mintemail.com',
  'moakt.com',
  'emailondeck.com',
]);

const TRIAL_HOURS = 24;
const IP_WINDOW_DAYS = 30;
const MAX_TRIALS_PER_IP = 1;

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = raw?.split(',')[0]?.trim();
  return ip || req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    res.status(401).json({ error: 'Missing authorization' });
    return;
  }

  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }
  const user = userData.user;

  const { data: existing } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    res.status(200).json({ status: 'already_exists' });
    return;
  }

  const email = user.email ?? '';
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  const ip = getClientIp(req);

  let eligible = true;
  let reason: string | null = null;

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    eligible = false;
    reason = 'disposable_email';
  }

  if (eligible && ip !== 'unknown') {
    const since = new Date(Date.now() - IP_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('trial_signups')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', since);
    if ((count ?? 0) >= MAX_TRIALS_PER_IP) {
      eligible = false;
      reason = 'ip_limit';
    }
  }

  await admin.from('trial_signups').insert({ ip, email });

  const trialEnd = eligible ? new Date(Date.now() + TRIAL_HOURS * 60 * 60 * 1000).toISOString() : null;

  await admin.from('subscriptions').insert({
    user_id: user.id,
    status: eligible ? 'trialing' : 'none',
    trial_end: trialEnd,
    signup_ip: ip,
  });

  res.status(200).json({ status: eligible ? 'trialing' : 'blocked', reason });
}
