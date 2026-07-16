import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../lib/i18n';
import { DomRecoveryBoundary } from './DomRecoveryBoundary';

function AlwaysThrows(): ReactElement {
  throw new Error('boom');
}

describe('DomRecoveryBoundary in German', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    consoleError.mockRestore();
    await i18n.changeLanguage('en');
  });

  it('shows the recovery fallback in German', () => {
    render(
      <DomRecoveryBoundary>
        <AlwaysThrows />
      </DomRecoveryBoundary>
    );

    expect(
      screen.getByRole('heading', { name: 'Etwas ist schiefgelaufen' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Neu laden' })
    ).toBeInTheDocument();
  });
});
