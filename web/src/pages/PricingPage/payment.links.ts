export const PASS_PRICES = {
  '24h': '$4',
  '7d': '$9',
} as const;

export const getSubscribeLink = (email?: string) => {
  const base =
    process.env.NODE_ENV === 'development'
      ? 'https://buy.stripe.com/test_fZebM83k00Rj6PeeUU'
      : 'https://buy.stripe.com/8x27sK9aV44W4rG3ek3Je08';
  return email ? `${base}?prefilled_email=${encodeURIComponent(email)}` : base;
};

export const getLifetimeLink = () =>
  'mailto:support@2anki.net?subject=Lifetime%20Access%20for%202anki.net&body=Hello,%20I%20would%20like%20to%20purchase%20a%20lifetime%20access%20for%202anki.net.';
