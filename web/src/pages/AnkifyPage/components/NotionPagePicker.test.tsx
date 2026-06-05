import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

import NotionPagePicker from './NotionPagePicker';
import { Backend } from '../../../lib/backend/Backend';
import NotionObject from '../../../lib/interfaces/NotionObject';

const samplePage = (overrides: Partial<NotionObject> = {}): NotionObject => ({
  id: 'page-1',
  object: 'page',
  title: 'Slash commands',
  url: 'https://www.notion.so/Slash-commands-abc123',
  icon: '📘',
  ...overrides,
});

const makeBackend = (pages: NotionObject[]): Backend =>
  ({
    searchTopLevelPages: vi.fn(async () => pages),
  }) as unknown as Backend;

const renderPicker = (
  backend: Backend,
  onSelect: (id: string, page?: NotionObject) => void = vi.fn()
) =>
  render(
    <NotionPagePicker
      backend={backend}
      onSelect={onSelect}
      busyId={null}
      selectLabel="Make this a deck"
      busyLabel="Subscribing…"
      subscribedLabel="Subscribed"
    />
  );

describe('NotionPagePicker — link to source Notion page', () => {
  test('renders an anchor to the page URL with target="_blank" and rel="noreferrer"', async () => {
    const backend = makeBackend([samplePage()]);
    renderPicker(backend);

    const link = await screen.findByRole('link', {
      name: /open slash commands in notion/i,
    });
    expect(link).toHaveAttribute(
      'href',
      'https://www.notion.so/Slash-commands-abc123'
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  test('aria-label and title include the page title and "(new tab)"', async () => {
    const backend = makeBackend([samplePage({ title: 'My study notes' })]);
    renderPicker(backend);

    const link = await screen.findByRole('link', {
      name: /open my study notes in notion \(new tab\)/i,
    });
    expect(link).toHaveAttribute(
      'title',
      'Open My study notes in Notion (new tab)'
    );
  });

  test('clicking the Notion link does not call onSelect', async () => {
    const onSelect = vi.fn();
    const backend = makeBackend([samplePage()]);
    renderPicker(backend, onSelect);

    const link = await screen.findByRole('link', {
      name: /open slash commands in notion/i,
    });
    fireEvent.click(link);

    expect(onSelect).not.toHaveBeenCalled();
  });

  test('renders no anchor when page.url is missing', async () => {
    const backend = makeBackend([samplePage({ url: '' })]);
    renderPicker(backend);

    await waitFor(() =>
      expect(screen.getByText('Slash commands')).toBeInTheDocument()
    );
    expect(
      screen.queryByRole('link', { name: /open slash commands in notion/i })
    ).not.toBeInTheDocument();
  });
});
