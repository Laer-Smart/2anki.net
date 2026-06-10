import Stripe from 'stripe';
import readline from 'node:readline';
import { CreatePricingV2PricesUseCase } from '../src/usecases/ops/CreatePricingV2PricesUseCase';

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
        price.unit_amount == null
          ? 'n/a'
          : (price.unit_amount / 100).toFixed(2);
      const interval = price.recurring?.interval ?? 'one-time';
      console.log(
        `  Price ${price.id} — ${amount} ${price.currency} / ${interval}` +
          ` — lookup_key=${price.lookup_key ?? 'none'}`
      );
    }
  }
  console.log('=== end catalog ===\n');
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

  const result = await new CreatePricingV2PricesUseCase(stripe).execute();
  for (const price of result.prices) {
    if (price.status === 'already_exists') {
      console.log(
        `Skip ${price.lookupKey}: already exists as ${price.priceId}.`
      );
    } else {
      console.log(
        `Created ${price.lookupKey}: ${price.priceId}` +
          ` (${price.unitAmount / 100} usd / ${price.interval}).`
      );
    }
  }
  console.log(
    `\nDone (${result.livemode ? 'live' : 'test'} mode).` +
      ' Re-run is safe — existing lookup_keys are skipped.'
  );
}

main().catch((error) => {
  console.error('pricing-v2 script failed:', error);
  process.exit(1);
});
