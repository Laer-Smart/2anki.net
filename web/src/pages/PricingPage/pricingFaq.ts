import { PASS_PRICES } from './payment.links';

export interface PricingFaqItem {
  question: string;
  answer: string;
}

export const PRICING_FAQ: PricingFaqItem[] = [
  {
    question: 'How many cards can I make for free?',
    answer:
      '100 cards per month on the free plan. No account required for one-off conversions — drop a file and download a deck.',
  },
  {
    question: 'Is there a one-time payment option?',
    answer: `Day Pass (${PASS_PRICES['24h']}) gives 24 hours of unlimited access. Week Pass (${PASS_PRICES['7d']}) gives 7 days. Both are one-time payments, no subscription required.`,
  },
  {
    question: 'What is the Unlimited plan?',
    answer:
      'Unlimited is $6 per month. It removes the 100-card limit, adds PDF support, lets you run multiple conversions at once, and includes unlimited Anki to Notion imports.',
  },
  {
    question: 'What is Auto Sync?',
    answer:
      'Auto Sync is $30 per month. Connect your Notion workspace once and 2anki checks your pages every 5 minutes. Edits in Notion flow into your Anki decks automatically — no exports, no manual steps.',
  },
  {
    question: 'What about Lifetime?',
    answer:
      'Lifetime starts at $345, paid once. It includes all Unlimited features plus Auto Sync. Apply on this page; access is granted by review.',
  },
];
