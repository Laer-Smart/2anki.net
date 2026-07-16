import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../lib/i18n';
import { MindmapMarkdownModal } from './MindmapMarkdownModal';

describe('MindmapMarkdownModal in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates the title and table headers', () => {
    render(<MindmapMarkdownModal onClose={vi.fn()} />);
    expect(
      screen.getByText('Markdown in Knotenbeschriftungen')
    ).toBeInTheDocument();
    expect(screen.getByText('Du tippst')).toBeInTheDocument();
    expect(screen.getByText('Du erhältst')).toBeInTheDocument();
  });
});
