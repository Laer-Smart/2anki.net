import Stripe from 'stripe';
import readline from 'node:readline';
import {
  PRICING_AMOUNTS,
  V2_ANNUAL_LOOKUP_KEY,
  V2_MONTHLY_LOOKUP_KEY,
} from '../src/usecases/checkout/pricingV2';

interface PlannedPrice {
  lookupKey: string;
  nickname: string;
  unitAmount: number;
  interval: 'month' | 'year';
}

const PLANNED_PRICES: PlannedPrice[] = [
  {
    lookupKey: V2_MONTHLY_LOOKUP_KEY,
    nickname: 'Unlimited Monthly v2',
    unitAmount: PRICING_AMOUNTS.v2.monthly,
    interval: 'month',
  },
  {
    lookupKey: V2_ANNUAL_LOOKUP_KEY,
    nickname: 'Unlimited Annual v2',
    unitAmount: PRICING_AMOUNTS.v2.annual,
    interval: 'year',
  },
];

const PRICE_METADATA = { version: 'v2', created: '2026-06' };

function detectMode(key: string): 'test' | 'live' | 'unknown' {
  if (key.startsWith('sk_test_')) return 'test';
  if (key.startsWith('sk_live_')) return 'live';
  return 'unknown';
}

async function confirmLive(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await new Promise<string>((resolve) => {
    rl.question(
      'You are about to create LIVE Stripe prices. Type "create live prices" to continue: ',
      resolve
    );
  });
  rl.close();
  return answer.trim() === 'create live prices';
}

async function printCatalog(stripe: Stripe): Promise<void> {
  console.log('\n=== Step 0: current catalog ===');
  const products = await stripe.products.list({ active: true, limit: 100 });
  for (const product of products.data) {
    console.log(`Product ${product.id} — ${product.name}`);
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      limit: 100,
    });
    for (const price of prices.data) {
      const amount =
        price.unit_amount == null ? 'n/a' : (price.unit_amount / 100).toFixed(2);
      const interval = price.recurring?.interval ?? 'one-time';
      console.log(
        `  Price ${price.id} — ${amount} ${price.currency} / ${interval}` +
          ` — lookup_key=${price.lookup_key ?? 'none'}`
      );
    }
  }
  console.log('=== end catalog ===\n');
}

async function findExistingPriceByLookupKey(
  stripe: Stripe,
  lookupKey: string
): Promise<Stripe.Price | null> {
  const result = await stripe.prices.list({
    lookup_keys: [lookupKey],
    limit: 1,
  });
  return result.data[0] ?? null;
}

async function resolveTargetProductId(stripe: Stripe): Promise<string> {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const unlimited = products.data.find((p) =>
    p.name.toLowerCase().includes('unlimited')
  );
  if (unlimited != null) {
    console.log(
      `Reusing existing product ${unlimited.id} (${unlimited.name}) for v2 prices.`
    );
    return unlimited.id;
  }
  const created = await stripe.products.create({
    name: 'Unlimited',
    metadata: PRICE_METADATA,
  });
  console.log(`Created product ${created.id} (Unlimited).`);
  return created.id;
}

async function ensurePrice(
  stripe: Stripe,
  productId: string,
  planned: PlannedPrice
): Promise<void> {
  const existing = await findExistingPriceByLookupKey(stripe, planned.lookupKey);
  if (existing != null) {
    console.log(
      `Skip ${planned.lookupKey}: already exists as ${existing.id}` +
        ` (${(existing.unit_amount ?? 0) / 100} ${existing.currency}).`
    );
    return;
  }
  const price = await stripe.prices.create({
    product: productId,
    currency: 'usd',
    unit_amount: planned.unitAmount,
    nickname: planned.nickname,
    lookup_key: planned.lookupKey,
    recurring: { interval: planned.interval },
    metadata: PRICE_METADATA,
  });
  console.log(
    `Created ${planned.lookupKey}: ${price.id}` +
      ` (${planned.unitAmount / 100} usd / ${planned.interval}).`
  );
}

async function main(): Promise<void> {
  const key = process.env.STRIPE_KEY ?? '';
  if (key === '') {
    console.error('STRIPE_KEY is not set. Aborting.');
    process.exit(1);
  }
  const mode = detectMode(key);
  const wantsLive = process.argv.includes('--live');

  console.log(`Detected Stripe key mode: ${mode}`);
  if (mode === 'unknown') {
    console.error('STRIPE_KEY is neither sk_test_ nor sk_live_. Aborting.');
    process.exit(1);
  }
  if (mode === 'live' && !wantsLive) {
    console.error(
      'Live key detected but --live flag is missing. Re-run with --live to confirm intent.'
    );
    process.exit(1);
  }
  if (mode === 'test' && wantsLive) {
    console.error(
      'Test key detected but --live flag was passed. Remove --live for test runs. Aborting.'
    );
    process.exit(1);
  }

  const stripe = new Stripe(key);
  await printCatalog(stripe);

  if (mode === 'live') {
    const confirmed = await confirmLive();
    if (!confirmed) {
      console.log('Live confirmation not given. No prices created.');
      process.exit(0);
    }
  }

  const productId = await resolveTargetProductId(stripe);
  for (const planned of PLANNED_PRICES) {
    await ensurePrice(stripe, productId, planned);
  }
  console.log('\nDone. Re-run is safe — existing lookup_keys are skipped.');
}

main().catch((error) => {
  console.error('pricing-v2 script failed:', error);
  process.exit(1);
});
