import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../components/FeedbackWidget/FeedbackWidget', () => ({
  FeedbackWidget: () => null,
}));

vi.mock('./changelog/index', () => ({
  changelog: [],
}));

vi.mock('./inProgress', () => ({
  inProgress: [],
}));

vi.mock('./backlog', () => ({
  backlog: [],
}));

describe('WhatsNewPage empty inProgress', () => {
  it('renders "Nothing in flight." when inProgress is empty', async () => {
    const { default: WhatsNewPage } = await import('./WhatsNewPage');
    render(
      <MemoryRouter>
        <WhatsNewPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Nothing in flight.')).toBeInTheDocument();
  });

  it('renders "Nothing queued." when backlog is empty', async () => {
    const { default: WhatsNewPage } = await import('./WhatsNewPage');
    render(
      <MemoryRouter>
        <WhatsNewPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Nothing queued.')).toBeInTheDocument();
  });
});
