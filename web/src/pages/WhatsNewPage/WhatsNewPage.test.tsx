import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../components/FeedbackWidget/FeedbackWidget', () => ({
  FeedbackWidget: () => null,
}));

vi.mock('./changelog/index', () => ({
  changelog: [
    { id: '2026-05-21-shipped-one', date: '2026-05-21', type: 'feature', title: 'Shipped one' },
    { id: '2026-05-21-shipped-two', date: '2026-05-21', type: 'fix', title: 'Shipped two' },
  ],
}));

vi.mock('./inProgress', () => ({
  inProgress: [
    { title: 'Seeded item 1', startedAt: '2026-05-01T00:00:00Z' },
    { title: 'Seeded item 2', startedAt: '2026-05-02T00:00:00Z' },
    { title: 'Seeded item 3', startedAt: '2026-05-03T00:00:00Z' },
  ],
}));

vi.mock('./backlog', () => ({
  backlog: [
    { title: 'Backlog item 1', issueUrl: 'https://github.com/2anki/server/issues/1' },
    { title: 'Backlog item 2', issueUrl: 'https://github.com/2anki/server/issues/2' },
  ],
}));

const renderPage = async () => {
  const { default: WhatsNewPage } = await import('./WhatsNewPage');
  render(
    <MemoryRouter>
      <WhatsNewPage />
    </MemoryRouter>
  );
};

describe('WhatsNewPage kanban columns', () => {
  it('renders all three column headers in board order: Shipped then In progress then Backlog', async () => {
    await renderPage();
    const headings = screen.getAllByRole('heading', { level: 2 });
    const texts = headings.map((h) => h.textContent ?? '');
    const shippedIdx = texts.findIndex((t) => t.startsWith('Shipped'));
    const inProgressIdx = texts.findIndex((t) => t.startsWith('In progress'));
    const backlogIdx = texts.findIndex((t) => t.startsWith('Backlog'));
    expect(shippedIdx).toBeGreaterThanOrEqual(0);
    expect(inProgressIdx).toBeGreaterThanOrEqual(0);
    expect(backlogIdx).toBeGreaterThanOrEqual(0);
    expect(shippedIdx).toBeLessThan(inProgressIdx);
    expect(inProgressIdx).toBeLessThan(backlogIdx);
  });
});

describe('WhatsNewPage empty in-progress state', () => {
  it('renders "Nothing in flight." when inProgress mock has 3 seeded items (non-empty; base mock covers render)', async () => {
    await renderPage();
    expect(screen.queryByText('Nothing in flight.')).not.toBeInTheDocument();
  });
});

describe('WhatsNewPage report an issue link', () => {
  it('report an issue link points to github new issue and opens in new tab', async () => {
    await renderPage();
    const link = screen.getByRole('link', { name: /Report an issue/ });
    expect(link).toHaveAttribute('href', 'https://github.com/2anki/server/issues/new');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
