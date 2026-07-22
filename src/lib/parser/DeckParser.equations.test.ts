import { setupTests } from '../../test/configure-jest';
import CardOption from './Settings/CardOption';
import { DeckParser } from './DeckParser';
import Workspace from './WorkSpace';

beforeEach(() => {
  setupTests();
});

function parse(html: string): DeckParser {
  const workspace = new Workspace(true, 'fs');
  return new DeckParser({
    name: 'equations.html',
    settings: new CardOption({ cherry: 'false' }),
    files: [{ name: 'equations.html', contents: html }],
    noLimits: true,
    workspace,
  });
}

test('converts a Notion block equation on the back of a card to Anki display math', () => {
  const html = `<html><head><title>Calculus</title></head>
<body><article class="page"><h1 class="page-title">Calculus</h1><div class="page-body">
<ul class="toggle"><li><details open=""><summary>Integral of x squared</summary>
<figure class="equation"><div contenteditable="false"><span class="katex-display"><span class="katex">
<span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow></mrow>
<annotation encoding="application/x-tex">\\int_0^1 x^2\\,dx = \\frac{1}{3}</annotation></semantics></math></span>
</span></span></div></figure>
</details></li></ul>
</div></article></body></html>`;

  const parser = parse(html);
  const back = parser.payload[0].cards[0].back;

  expect(back).toContain('\\[\\int_0^1 x^2\\,dx = \\frac{1}{3}\\]');
  expect(back).not.toContain('katex');
});

test('converts a Notion inline equation in a card summary to Anki inline math', () => {
  const html = `<html><head><title>Physics</title></head>
<body><article class="page"><h1 class="page-title">Physics</h1><div class="page-body">
<ul class="toggle"><li><details open=""><summary>Mass energy equivalence <span class="notion-text-equation-token">
<span class="katex"><span class="katex-mathml"><math><semantics><mrow></mrow>
<annotation encoding="application/x-tex">E = mc^2</annotation></semantics></math></span></span></span></summary>
<p>Einstein.</p></details></li></ul>
</div></article></body></html>`;

  const parser = parse(html);
  const front = parser.payload[0].cards[0].name;

  expect(front).toContain('\\(E = mc^2\\)');
  expect(front).not.toContain('katex');
});
