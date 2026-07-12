import { render, screen } from '@testing-library/react';
import { TrustNote } from './TrustNote';

describe('TrustNote', () => {
  it('renders the full block with the founder name, contributors, and independence facts', () => {
    render(<TrustNote />);

    expect(screen.getByText(/Independent since 2020/)).toBeInTheDocument();
    expect(screen.getByText('Alexander Alemayhu')).toBeInTheDocument();
    expect(screen.getByText(/and its contributors/)).toBeInTheDocument();
    expect(screen.getByText(/not investors/)).toBeInTheDocument();
  });

  it('omits the open-source claim in the full block so the landing hero guard holds', () => {
    render(<TrustNote />);

    expect(screen.queryByText(/open source/i)).toBeNull();
  });

  it('renders the compact one-liner crediting contributors for the pricing decision zone', () => {
    render(<TrustNote compact />);

    expect(
      screen.getByText(
        /Independent and open source since 2020, built by its contributors — funded by subscribers, not investors\./
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Alexander Alemayhu')).toBeNull();
  });
});
