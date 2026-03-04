import Stripe from 'stripe';

export function getStripeClient(apiKey?: string | null): Stripe {
  const key = apiKey || process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(key);
}
