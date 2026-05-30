import { setupTests } from '../../test/configure-jest';
import CardOption from './Settings/CardOption';
import { DeckParser } from './DeckParser';
import Workspace from './WorkSpace';

beforeEach(() => setupTests());

function buildParser(html: string, settings: CardOption): DeckParser {
  const workspace = new Workspace(true, 'fs');
  return new DeckParser({
    name: 'toggle-h3.html',
    settings,
    files: [{ name: 'toggle-h3.html', contents: html }],
    noLimits: true,
    workspace,
  });
}

describe('Toggle with H3 in body (Notion HTML export)', () => {
  const NEW_FORMAT_TOGGLE_WITH_H3 = `<!DOCTYPE html>
<html><head><title>Episode 12</title></head>
<body><article id="episode-12" class="page sans"><div class="page-body">
<div style="display:contents" dir="auto">
<ul id="toggle-with-h3" class="toggle"><li>
<details open="">
<summary>What did the guest argue about deliberate practice?</summary>
<div style="display:contents" dir="auto"><p class="">They argued it requires immediate feedback.</p></div>
<div style="display:contents" dir="auto"><h3 id="h3-key-point" class="">Key point</h3></div>
<div style="display:contents" dir="auto"><p class="">Without feedback, repetition becomes habit, not skill.</p></div>
</details>
</li></ul>
</div>
</div></article></body></html>`;

  it('preserves the H3 heading text inside a toggle body (maxOne=true)', () => {
    const parser = buildParser(
      NEW_FORMAT_TOGGLE_WITH_H3,
      new CardOption({ 'max-one-toggle-per-card': 'true', cherry: 'false' })
    );
    const deck = parser.payload[0];
    expect(deck).toBeDefined();
    expect(deck.cards.length).toBe(1);
    expect(deck.cards[0].back).toContain('Key point');
  });

  it('preserves the H3 heading text inside a toggle body (maxOne=false)', () => {
    const parser = buildParser(
      NEW_FORMAT_TOGGLE_WITH_H3,
      new CardOption({ 'max-one-toggle-per-card': 'false', cherry: 'false' })
    );
    const deck = parser.payload[0];
    expect(deck).toBeDefined();
    expect(deck.cards.length).toBe(1);
    expect(deck.cards[0].back).toContain('Key point');
  });

  const LEGACY_TOGGLE_WITH_H3 = `<!DOCTYPE html>
<html><head><title>Episode 13</title></head>
<body><article id="episode-13" class="page sans"><div class="page-body">
<ul class="toggle"><li>
<details open="">
<summary>How does spaced repetition help recall?</summary>
<p>It strengthens retrieval pathways.</p>
<h3 id="h3-legacy">Mechanism</h3>
<p>Each successful retrieval increases the retention interval.</p>
</details>
</li></ul>
</div></article></body></html>`;

  it('preserves the H3 heading text inside a toggle body (legacy format)', () => {
    const parser = buildParser(
      LEGACY_TOGGLE_WITH_H3,
      new CardOption({ 'max-one-toggle-per-card': 'true', cherry: 'false' })
    );
    const deck = parser.payload[0];
    expect(deck).toBeDefined();
    expect(deck.cards.length).toBe(1);
    expect(deck.cards[0].back).toContain('Mechanism');
  });

  const TOGGLE_WITH_TOGGLEABLE_H3_BODY = `<!DOCTYPE html>
<html><head><title>Episode 14</title></head>
<body><article id="episode-14" class="page sans"><div class="page-body">
<ul class="toggle"><li>
<details open="">
<summary>What is deliberate practice?</summary>
<p>It is goal-directed repetition with feedback.</p>
<details open=""><summary><h3>Core elements</h3></summary><div class="indented"><p>Focus, feedback, repetition.</p></div></details>
<p>Without these, repetition becomes habit, not skill.</p>
</details>
</li></ul>
</div></article></body></html>`;

  it('preserves the toggleable-H3 heading text when nested inside a regular toggle (maxOne=true)', () => {
    const parser = buildParser(
      TOGGLE_WITH_TOGGLEABLE_H3_BODY,
      new CardOption({ 'max-one-toggle-per-card': 'true', cherry: 'false' })
    );
    const deck = parser.payload[0];
    expect(deck).toBeDefined();
    expect(deck.cards.length).toBe(1);
    expect(deck.cards[0].back).toContain('Core elements');
  });
});
