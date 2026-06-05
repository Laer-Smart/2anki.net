import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, test } from 'vitest';

import ReEngagementCommentsList from './ReEngagementCommentsList';

describe('ReEngagementCommentsList', () => {
  test('renders each comment with reason + content_type and body', () => {
    render(
      <ReEngagementCommentsList
        points={[
          {
            stopped_reason: 'Switched to another tool',
            content_type: 'pdf',
            comment: 'I moved to RemNote',
            created_at: '2026-05-07T09:00:00.000Z',
          },
          {
            stopped_reason: 'No longer studying',
            content_type: 'notion',
            comment: 'Done with my exam',
            created_at: '2026-05-05T10:00:00.000Z',
          },
        ]}
      />
    );

    expect(
      screen.getByText('Switched to another tool · pdf')
    ).toBeInTheDocument();
    expect(screen.getByText('I moved to RemNote')).toBeInTheDocument();
    expect(screen.getByText('No longer studying · notion')).toBeInTheDocument();
    expect(screen.getByText('Done with my exam')).toBeInTheDocument();
  });

  test('renders an empty list when given no points', () => {
    const { container } = render(<ReEngagementCommentsList points={[]} />);
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });
});
