import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../lib/i18n';
import { ChunkReloadOverlay } from './ChunkReloadOverlay';

describe('ChunkReloadOverlay in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the update message in German', () => {
    render(<ChunkReloadOverlay />);
    expect(
      screen.getByText('Aktualisierung auf die neueste Version.')
    ).toBeInTheDocument();
  });
});
