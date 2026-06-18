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
      'Unlimited removes the 100-card limit, adds PDF support, lets you run multiple conversions at once, and includes unlimited Anki to Notion imports. Pricing is on the cards above.',
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
  {
    question: 'Can I cancel anytime?',
    answer:
      'Cancel in one click from your account — no need to email support. On a yearly plan, cancelling stops the next renewal and your access stays through the year you already paid for; unused time is not refunded. Passes are one-time, so there is nothing to cancel.',
  },
  {
    question: 'Is there an app?',
    answer:
      'Yes — 2anki is free on the App Store for iPhone, iPad, and Mac, alongside the web app. Files are parsed on-device. The same plans apply: Day Pass, Week Pass, and Unlimited are available as in-app purchases.',
  },
  {
    question: 'What happens to my decks if I stop paying?',
    answer:
      'They stay yours. Every deck exports as a native .apkg that works in any Anki client, offline, with no lock-in.',
  },
];
