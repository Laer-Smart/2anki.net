import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../lib/i18n';
import { CancellationFollowUp } from './CancellationFollowUp';

describe('CancellationFollowUp in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates the reasons and submit button but keeps the English reason value', () => {
    const onSubmit = vi.fn();
    render(
      <CancellationFollowUp
        onSubmit={onSubmit}
        onSkip={vi.fn()}
        isSubmitting={false}
      />
    );

    expect(
      screen.getByText('Warum hast du gekündigt? (optional)')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Zu teuer'));
    fireEvent.click(screen.getByRole('button', { name: 'Feedback senden' }));

    expect(onSubmit).toHaveBeenCalledWith('Too expensive', '');
  });
});
