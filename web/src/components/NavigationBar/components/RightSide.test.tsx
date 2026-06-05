import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';
import { RightSide } from './RightSide';

function getNavLinks() {
  return Array.from(document.querySelectorAll('nav, [role="navigation"], div'))
    .flatMap((el) => Array.from(el.querySelectorAll('a')))
    .filter((a, idx, arr) => arr.findIndex((b) => b === a) === idx);
}

describe('RightSide (anonymous nav)', () => {
  it('renders Upload, Docs, Pricing, and Login in order', () => {
    render(<RightSide path="/" />);
    const upload = screen.getByRole('link', { name: 'Make flashcards' });
    const docs = screen.getByRole('link', { name: 'Docs' });
    const pricing = screen.getByRole('link', { name: 'Pricing' });
    const login = screen.getByRole('link', { name: 'Log in' });

    expect(upload).toBeInTheDocument();
    expect(docs).toBeInTheDocument();
    expect(pricing).toBeInTheDocument();
    expect(login).toBeInTheDocument();

    const positions = getNavLinks().map((a) => a.textContent);
    const uploadIdx = positions.indexOf('Make flashcards');
    const docsIdx = positions.indexOf('Docs');
    const pricingIdx = positions.indexOf('Pricing');
    expect(uploadIdx).toBeGreaterThanOrEqual(0);
    expect(docsIdx).toBeGreaterThan(uploadIdx);
    expect(pricingIdx).toBeGreaterThan(docsIdx);
  });

  it('Docs link points to /documentation', () => {
    render(<RightSide path="/" />);
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute(
      'href',
      '/documentation'
    );
  });

  it('does not render the legacy Documentation label', () => {
    render(<RightSide path="/" />);
    expect(
      screen.queryByRole('link', { name: 'Documentation' })
    ).not.toBeInTheDocument();
  });
});
