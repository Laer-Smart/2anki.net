import * as cheerio from 'cheerio';

import {
  ancestorSectionTags,
  collectAndStripSectionMarkers,
} from './collectSectionTags';

const load = (body: string) =>
  cheerio.load(`<article><div class="page-body">${body}</div></article>`);

describe('collectAndStripSectionMarkers', () => {
  it('maps a marker to its nearest enclosing toggle and strips it', () => {
    const dom = load(`
      <ul class="toggle" id="ch1">
        <li><details>
          <summary>Chapter 1</summary>
          <p><del>chapter-1</del></p>
          <ul class="toggle" id="w1"><li><details><summary>apple</summary></details></li></ul>
        </details></li>
      </ul>`);

    const owners = collectAndStripSectionMarkers(dom);
    const ch1 = dom('#ch1').get(0)!;

    expect(owners.get(ch1)).toEqual(['chapter-1']);
    expect(dom('del').length).toBe(0);
    expect(dom('.page-body').text()).not.toContain('chapter-1');
  });

  it('removes the wrapping paragraph when the marker was its only content', () => {
    const dom = load(`
      <ul class="toggle" id="ch1"><li><details>
        <summary>Chapter 1</summary>
        <p><del>chapter-1</del></p>
      </details></li></ul>`);

    collectAndStripSectionMarkers(dom);

    expect(dom('p').length).toBe(0);
  });

  it('keeps surrounding text when the paragraph has more than the marker', () => {
    const dom = load(`
      <ul class="toggle" id="ch1"><li><details>
        <summary>Chapter 1</summary>
        <p>keep me <del>chapter-1</del></p>
      </details></li></ul>`);

    collectAndStripSectionMarkers(dom);

    expect(dom('p').length).toBe(1);
    expect(dom('p').text()).toContain('keep me');
  });
});

describe('ancestorSectionTags', () => {
  it('unions and dedupes every enclosing toggle marker for a nested toggle', () => {
    const dom = load(`
      <ul class="toggle" id="ch1"><li><details>
        <summary>Chapter 1</summary>
        <p><del>chapter-1</del></p>
        <ul class="toggle" id="secA"><li><details>
          <summary>Section A</summary>
          <p><del>section-A</del></p>
          <ul class="toggle" id="leaf"><li><details><summary>banana</summary></details></li></ul>
        </details></li></ul>
      </details></li></ul>`);

    const owners = collectAndStripSectionMarkers(dom);
    const leaf = dom('#leaf').get(0)!;

    expect(ancestorSectionTags(dom, leaf, owners)).toEqual(
      expect.arrayContaining(['chapter-1', 'section-A'])
    );
  });

  it('returns an empty list for a toggle with no marked ancestors', () => {
    const dom = load(
      `<ul class="toggle" id="lonely"><li><details><summary>x</summary></details></li></ul>`
    );
    const owners = collectAndStripSectionMarkers(dom);
    const lonely = dom('#lonely').get(0)!;

    expect(ancestorSectionTags(dom, lonely, owners)).toEqual([]);
  });
});
