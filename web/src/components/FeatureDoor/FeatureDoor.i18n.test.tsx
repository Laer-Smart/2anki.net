import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../lib/i18n';
import { FeatureDoor } from './FeatureDoor';

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({ recordFeatureInterest: vi.fn() }),
}));

describe('FeatureDoor in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates the default question and the interest button', () => {
    render(<FeatureDoor featureKey="mindmaps" title="Mindmaps" />);
    expect(screen.getByText('Würdest du das nutzen?')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Das würde ich nutzen' })
    ).toBeInTheDocument();
  });

  it('keeps a caller-supplied question', () => {
    render(
      <FeatureDoor featureKey="mindmaps" title="Mindmaps" question="Custom?" />
    );
    expect(screen.getByText('Custom?')).toBeInTheDocument();
  });
});
