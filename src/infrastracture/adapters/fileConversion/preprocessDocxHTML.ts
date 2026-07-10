import * as cheerio from 'cheerio';

function isAnswerOption(text: string): boolean {
  return /^\*?[A-Za-z][.)]\s/.test(text.trim());
}

function isCorrectAnswer(text: string): boolean {
  return text.trim().startsWith('*');
}

function stripAsterisk(text: string): string {
  return text.trim().replace(/^\*/, '');
}

function buildToggle(
  question: string,
  options: string[],
  correctAnswers: string[]
): string {
  const optionsHTML = options.map((opt) => `<li>${opt}</li>`).join('');
  const answerHTML = correctAnswers
    .map((a) => `<strong>${a}</strong>`)
    .join('<br />');

  return `<details><summary>${question}<br /><ul>${optionsHTML}</ul></summary>${answerHTML}</details>`;
}

function looksLikeFlashcard(parts: string[]): boolean {
  if (parts.length <= 1) return false;
  const answerLines = parts.slice(1);
  return answerLines.some((line) => isCorrectAnswer(line));
}

function processListItem(html: string): string | null {
  const parts = html
    .split(/<br\s*\/?>/i)
    .map((p) => p.trim())
    .filter(Boolean);

  if (!looksLikeFlashcard(parts)) {
    return null;
  }

  const question = parts[0];
  const answerLines = parts.slice(1);

  const hasMarkedAnswers = answerLines.some((line) => isCorrectAnswer(line));

  if (!hasMarkedAnswers) {
    return null;
  }

  const options: string[] = [];
  const correctAnswers: string[] = [];

  for (const line of answerLines) {
    const cleaned = stripAsterisk(line);
    options.push(cleaned);
    if (isCorrectAnswer(line)) {
      correctAnswers.push(cleaned);
    }
  }

  return buildToggle(question, options, correctAnswers);
}

function buildSectionToggles(
  $: any,
  summary: string,
  siblings: any[],
  bulletFanOut: boolean
): string {
  if (!bulletFanOut) {
    const contentHTML = siblings.map((el: any) => $.html(el)).join('');
    return `<details><summary>${summary}</summary>${contentHTML}</details>`;
  }

  const bullets: string[] = [];
  const otherParts: string[] = [];

  for (const el of siblings) {
    const $el = $(el);
    if ($el.is('ul, ol')) {
      $el.children('li').each((_: number, li: any) => {
        const inner = $(li).html();
        if (inner != null && inner.trim().length > 0) {
          bullets.push(inner);
        }
      });
    } else {
      const html = $.html(el);
      if (html) otherParts.push(html);
    }
  }

  if (bullets.length === 0) {
    return `<details><summary>${summary}</summary>${otherParts.join('')}</details>`;
  }

  const toggles: string[] = [];
  if (otherParts.length > 0) {
    toggles.push(
      `<details><summary>${summary}</summary>${otherParts.join('')}</details>`
    );
  }
  bullets.forEach((bullet, index) => {
    const cue =
      bullets.length > 1
        ? `${summary} — ${index + 1}/${bullets.length}`
        : summary;
    toggles.push(`<details><summary>${cue}</summary>${bullet}</details>`);
  });
  return toggles.join('');
}

function convertHeadingsToToggles(
  $: any,
  originalHTML: string,
  bulletFanOut: boolean
): string {
  const headings = $('h1, h2, h3, h4, h5, h6');
  if (headings.length === 0) {
    return originalHTML;
  }

  let converted = false;

  headings.each((_: number, heading: any) => {
    const $heading = $(heading);
    const headingText = $heading.text().trim();
    const hasImage = $heading.find('img').length > 0;
    if (!headingText && !hasImage) return;

    const summary = hasImage ? ($heading.html() ?? headingText) : headingText;

    const sectionSiblings: any[] = [];
    let sibling = $heading.next();

    while (sibling.length > 0 && !sibling.is('h1, h2, h3, h4, h5, h6')) {
      sectionSiblings.push(sibling.get(0));
      sibling = sibling.next();
    }

    if (sectionSiblings.length === 0) return;

    const toggles = buildSectionToggles(
      $,
      summary,
      sectionSiblings,
      bulletFanOut
    );

    sectionSiblings.forEach(() => {
      const next = $heading.next();
      if (next.length > 0 && !next.is('h1, h2, h3, h4, h5, h6')) {
        next.remove();
      }
    });

    $heading.replaceWith(toggles);
    converted = true;
  });

  return converted ? $.html() : originalHTML;
}

export interface PreprocessDocxOptions {
  bulletFanOut?: boolean;
}

export function preprocessDocxHTML(
  html: string,
  options: PreprocessDocxOptions = {}
): string {
  const $ = cheerio.load(html, { xmlMode: false });

  let mcConverted = false;
  const lists = $('ol, ul');

  lists.each((_, list) => {
    const items = $(list).find('> li');
    const toggles: string[] = [];
    let hasFlashcards = false;

    items.each((__, li) => {
      const itemHTML = $(li).html() ?? '';
      const result = processListItem(itemHTML);
      if (result !== null) {
        toggles.push(result);
        hasFlashcards = true;
      }
    });

    if (hasFlashcards) {
      $(list).replaceWith(toggles.join('\n'));
      mcConverted = true;
    }
  });

  if (mcConverted) {
    return $.html();
  }

  return convertHeadingsToToggles($, html, options.bulletFanOut === true);
}
