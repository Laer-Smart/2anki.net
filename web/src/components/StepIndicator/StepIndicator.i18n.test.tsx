import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../lib/i18n';
import { StepIndicator } from './StepIndicator';

describe('StepIndicator in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the step labels and progress label in German', () => {
    render(<StepIndicator currentStep={2} />);

    expect(
      screen.getByRole('list', { name: 'Konvertierungsfortschritt' })
    ).toBeInTheDocument();
    expect(screen.getByText('Hochgeladen')).toBeInTheDocument();
    expect(screen.getByText('Wird gelesen')).toBeInTheDocument();
    expect(screen.getByText('Wird erstellt')).toBeInTheDocument();
    expect(screen.getByText('Wird verpackt')).toBeInTheDocument();
  });
});
