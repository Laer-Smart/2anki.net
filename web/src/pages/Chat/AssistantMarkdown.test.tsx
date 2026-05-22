import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AssistantMarkdown from './AssistantMarkdown';

describe('AssistantMarkdown', () => {
  it('renders bold markdown as <strong>', () => {
    render(<AssistantMarkdown>{'**bold text**'}</AssistantMarkdown>);
    expect(screen.getByText('bold text').tagName).toBe('STRONG');
  });

  it('does not inject <script> tags from model output', () => {
    const { container } = render(
      <AssistantMarkdown>
        {'hello <script>alert(1)</script> world'}
      </AssistantMarkdown>
    );
    expect(container.querySelector('script')).toBeNull();
  });

  it('strips javascript: hrefs from links', () => {
    const { container } = render(
      <AssistantMarkdown>{'[click me](javascript:alert(1))'}</AssistantMarkdown>
    );
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBeNull();
  });

  it('opens https links in a new tab with rel=noopener', () => {
    render(
      <AssistantMarkdown>{'[2anki](https://2anki.net)'}</AssistantMarkdown>
    );
    const link = screen.getByRole('link', { name: '2anki' });
    expect(link.getAttribute('href')).toBe('https://2anki.net');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
