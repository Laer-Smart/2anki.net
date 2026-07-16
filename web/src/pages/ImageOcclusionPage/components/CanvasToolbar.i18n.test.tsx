import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../../lib/i18n';
import { CanvasToolbar } from './CanvasToolbar';

function renderToolbar() {
  return render(
    <CanvasToolbar
      activeTool="rect"
      onToolChange={vi.fn()}
      masksHidden={false}
      onToggleMasks={vi.fn()}
      canUndo
      canRedo
      onUndo={vi.fn()}
      onRedo={vi.fn()}
      hasSelection
      onDuplicate={vi.fn()}
      onDelete={vi.fn()}
      zoom={1}
      onZoomChange={vi.fn()}
      onFitZoom={vi.fn()}
    />
  );
}

describe('CanvasToolbar in German', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('de');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('translates the tool labels', () => {
    renderToolbar();
    expect(
      screen.getByRole('button', { name: 'Rechteck-Werkzeug' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Masken ausblenden' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('toolbar', { name: 'Zeichenwerkzeuge' })
    ).toBeInTheDocument();
  });
});
