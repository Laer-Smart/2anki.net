import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PreviewSettingsRail } from './PreviewSettings';
import { PreviewSettings } from '../../lib/preview/classifyBlock';

const defaults: PreviewSettings = {
  includeToggles: true,
  includeHeadings: false,
  recurseSubPages: true,
  columnsAsCards: false,
};

function renderRail(settings = defaults, onChange = vi.fn()) {
  return render(
    <MemoryRouter>
      <PreviewSettingsRail
        settings={settings}
        onChange={onChange}
        convertHref="/rules/page-abc"
      />
    </MemoryRouter>
  );
}

describe('PreviewSettingsRail', () => {
  it('renders the Card settings heading', () => {
    renderRail();
    expect(screen.getByText('Card settings')).toBeInTheDocument();
  });

  it('renders all four toggle labels', () => {
    renderRail();
    expect(screen.getByText('Include toggles as cards')).toBeInTheDocument();
    expect(screen.getByText('Include headings as cards')).toBeInTheDocument();
    expect(screen.getByText('Recurse into sub-pages')).toBeInTheDocument();
    expect(screen.getByText('Treat columns as cards')).toBeInTheDocument();
  });

  it('renders the convert button linking to convertHref', () => {
    renderRail();
    const btn = screen.getByRole('link', { name: 'Convert with these settings' });
    expect(btn).toHaveAttribute('href', '/rules/page-abc');
  });

  it('calls onChange with toggled includeToggles when that row is clicked', () => {
    const onChange = vi.fn();
    renderRail(defaults, onChange);
    fireEvent.click(screen.getByRole('switch', { name: 'Include toggles as cards' }));
    expect(onChange).toHaveBeenCalledWith({ ...defaults, includeToggles: false });
  });

  it('calls onChange with toggled includeHeadings when that row is clicked', () => {
    const onChange = vi.fn();
    renderRail(defaults, onChange);
    fireEvent.click(screen.getByRole('switch', { name: 'Include headings as cards' }));
    expect(onChange).toHaveBeenCalledWith({ ...defaults, includeHeadings: true });
  });

  it('reflects checked state via aria-checked', () => {
    renderRail();
    const togglesSwitch = screen.getByRole('switch', { name: 'Include toggles as cards' });
    expect(togglesSwitch).toHaveAttribute('aria-checked', 'true');
    const headingsSwitch = screen.getByRole('switch', { name: 'Include headings as cards' });
    expect(headingsSwitch).toHaveAttribute('aria-checked', 'false');
  });
});
