import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

  try {
    const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }
    const user = userData.user;

    const { data: sub } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let customerId = sub?.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      if (sub) {
        await admin.from('subscriptions').update({ stripe_customer_id: customerId }).eq('user_id', user.id);
      } else {
        await admin
          .from('subscriptions')
          .insert({ user_id: user.id, stripe_customer_id: customerId, status: 'none' });
      }
    }

    const origin = (req.headers.origin as string) || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${origin}/billing?checkout=success`,
      cancel_url: `${origin}/billing?checkout=cancelled`,
      // Managed Payments (Stripe's merchant-of-record mode, on by default for
      // new accounts) auto-calculates and adds VAT. CarcassIQ isn't VAT
      // registered, so £9 should be the final price the customer pays.
      managed_payments: { enabled: false },
    });

    res.status(200).json({
      url: session.url,
      amount_subtotal: session.amount_subtotal,
      amount_total: session.amount_total,
      total_details: session.total_details,
    });
  } catch (err) {
    console.error('create-checkout-session error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
