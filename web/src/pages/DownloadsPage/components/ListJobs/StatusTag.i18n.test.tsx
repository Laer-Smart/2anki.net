import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import i18n from '../../../../lib/i18n';
import { StatusTag } from './StatusTag';

describe('StatusTag in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates the done and failed labels', () => {
    const { rerender } = render(<StatusTag status="done" />);
    expect(screen.getByText('Fertig')).toBeInTheDocument();
    rerender(<StatusTag status="failed" />);
    expect(screen.getByText('Fehlgeschlagen')).toBeInTheDocument();
  });

  it('translates the Claude chunk progress label', () => {
    render(<StatusTag status={'claude:chunk:2:5' as never} />);
    expect(
      screen.getByText('Karteikarten werden erstellt (2 / 5)')
    ).toBeInTheDocument();
  });
});
