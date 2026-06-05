import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, test } from 'vitest';

import SignupCountriesChart from './SignupCountriesChart';

describe('SignupCountriesChart', () => {
  test('renders one row per country with its count', () => {
    render(
      <SignupCountriesChart
        points={[
          { country: 'NO', count: 240 },
          { country: 'DE', count: 180 },
        ]}
      />
    );

    expect(screen.getByText('NO')).toBeInTheDocument();
    expect(screen.getByText('DE')).toBeInTheDocument();
    expect(screen.getByText('240')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument();
  });

  test('renders the "+N others" tail row when othersCount > 0', () => {
    render(
      <SignupCountriesChart
        points={[{ country: 'NO', count: 100 }]}
        othersCount={42}
      />
    );

    expect(screen.getByText('+42 others')).toBeInTheDocument();
  });

  test('omits the tail row when othersCount is 0', () => {
    render(<SignupCountriesChart points={[{ country: 'NO', count: 100 }]} />);
    expect(screen.queryByText(/others/)).toBeNull();
  });

  test('renders an empty list when given no points and no others', () => {
    const { container } = render(<SignupCountriesChart points={[]} />);
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });

  test('formats counts of 10 000+ with a thin space separator', () => {
    render(<SignupCountriesChart points={[{ country: 'US', count: 12450 }]} />);
    expect(screen.getByText('12 450')).toBeInTheDocument();
  });
});
