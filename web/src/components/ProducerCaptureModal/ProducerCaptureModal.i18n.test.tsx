import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../lib/i18n';
import { ProducerCaptureModal } from './ProducerCaptureModal';

describe('ProducerCaptureModal in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates the title, lead, and submit button', () => {
    render(
      <ProducerCaptureModal isOpen source="pricing_page" onClose={vi.fn()} />
    );
    expect(screen.getByText('Sag uns, was du brauchst')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Auf die Early-Access-Liste' })
    ).toBeInTheDocument();
  });

  it('keeps the analytics team-size value stable while translating the label', () => {
    render(
      <ProducerCaptureModal isOpen source="pricing_page" onClose={vi.fn()} />
    );
    const option = screen.getByRole('option', { name: 'Nur ich' });
    expect(option).toHaveValue('Just me');
  });
});
