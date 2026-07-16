import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../../lib/i18n';
import ApkgDropZone from './ApkgDropZone';

describe('ApkgDropZone in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates the drop prompt and helper', () => {
    render(
      <ApkgDropZone
        file={null}
        onFileSelected={vi.fn()}
        onFileRejected={vi.fn()}
        disabled={false}
      />
    );
    expect(
      screen.getByText('Zieh deine .apkg-Datei hierher')
    ).toBeInTheDocument();
    expect(screen.getByText('oder klicke zum Auswählen')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Zieh deine .apkg-Datei hierher' })
    ).toBeInTheDocument();
  });
});
