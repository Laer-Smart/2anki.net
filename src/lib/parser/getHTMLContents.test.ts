import { describe } from 'node:test';
import { getFileContents } from './getFileContents';

describe('getHTMLContents', () => {
  test('returns html contents', () => {
    expect(
      getFileContents({ contents: '<h1>html</h1>', name: 'index.html' })
    ).toBe('<h1>html</h1>');
  });
  test('returns html for markdown', () => {
    expect(getFileContents({ contents: '# md', name: 'README.md' })).toBe(
      '<h1>md</h1>\n'
    );
  });
});
