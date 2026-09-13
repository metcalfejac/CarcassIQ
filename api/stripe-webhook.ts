import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Stripe needs the exact raw request bytes to verify the signature, so
// Vercel's default JSON body parsing must be disabled for this route.
export const config = {
  api: {
    bodyParser: false,
  },
};

// Stripe moved current_period_end from the subscription to each subscription
// item (a subscription can have multiple items with different billing
// anchors); we only ever create single-item subscriptions, so the first
// item's period end is the one that matters.
function currentPeriodEnd(subscription: Stripe.Subscription): string | null {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
}

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const signature = req.headers['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    res.status(400).send('Missing Stripe signature');
    return;
  }

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    res.status(400).send('Webhook signature verification failed');
    return;
  }

  try {
    const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    async function updateByCustomerId(customerId: string, fields: Record<string, unknown>) {
      await admin.from('subscriptions').update(fields).eq('stripe_customer_id', customerId);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;
        if (customerId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await updateByCustomerId(customerId, {
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            price_id: subscription.items.data[0]?.price.id ?? null,
            current_period_end: currentPeriodEnd(subscription),
          });
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await updateByCustomerId(subscription.customer as string, {
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          price_id: subscription.items.data[0]?.price.id ?? null,
          current_period_end: currentPeriodEnd(subscription),
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await updateByCustomerId(subscription.customer as string, { status: 'canceled' });
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          await updateByCustomerId(invoice.customer as string, { status: 'past_due' });
        }
        break;
      }
      default:
        break;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('stripe-webhook error', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
}
