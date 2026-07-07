import { AnswerConfig } from './answersConfig';

export function buildArticleJsonLd(config: AnswerConfig): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: config.title,
    description: config.description,
    articleSection: config.sections.map((section) => section.heading),
    articleBody: config.sections.map((section) => section.body).join('\n\n'),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://2anki.net/answers/${config.slug}`,
    },
  });
}

export function buildFaqJsonLd(config: AnswerConfig): string | null {
  if (config.faqs == null || config.faqs.length === 0) {
    return null;
  }
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: config.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  });
}
