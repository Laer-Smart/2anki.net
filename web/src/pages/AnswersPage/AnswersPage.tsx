import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import NotFoundPage from '../NotFoundPage';
import { AnswerFigure } from './AnswerFigures';
import { AnswerConfig, ANSWERS_PAGES } from './answersConfig';
import styles from './AnswersPage.module.css';

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

function AnswersPage() {
  const { slug } = useParams<{ slug: string }>();
  const config = slug == null ? undefined : ANSWERS_PAGES.get(slug);

  if (config == null) {
    return <NotFoundPage />;
  }

  const canonical = `https://2anki.net/answers/${config.slug}`;

  const articleJsonLd = buildArticleJsonLd(config);

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{config.title}</title>
        <meta name="description" content={config.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={config.title} />
        <meta property="og:description" content={config.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{articleJsonLd}</script>
      </Helmet>

      <h1 className={styles.h1}>{config.h1}</h1>
      <p className={styles.intro}>{config.intro}</p>

      {config.sections.map((section) => (
        <div key={section.heading} className={styles.section}>
          <h2 className={styles.sectionHeading}>{section.heading}</h2>
          <p className={styles.sectionBody}>{section.body}</p>
          {section.figure && (
            <AnswerFigure
              kind={section.figure.kind}
              caption={section.figure.caption}
            />
          )}
        </div>
      ))}

      <nav className={styles.related} aria-label="Related">
        <p className={styles.relatedHeading}>Related</p>
        <ul className={styles.relatedList}>
          {config.relatedLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className={styles.relatedLink}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default AnswersPage;
