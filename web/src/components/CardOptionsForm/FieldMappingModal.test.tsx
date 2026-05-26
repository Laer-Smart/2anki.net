import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { FieldMappingModal } from './FieldMappingModal';
import type { FieldMapping } from '../../lib/cardFields/types';

const basicMapping: FieldMapping = {
  templateName: 'n2a-basic',
  fields: [
    { name: 'Front', instruction: 'The question or term' },
    { name: 'Back', instruction: 'The answer or definition' },
  ],
};

describe('FieldMappingModal', () => {
  it('renders the wrapped panel with a field input per mapping field', () => {
    render(
      <FieldMappingModal
        isOpen
        onClose={() => undefined}
        mapping={basicMapping}
        onChange={() => undefined}
      />
    );
    expect(screen.getByLabelText('Front')).toBeInTheDocument();
    expect(screen.getByLabelText('Back')).toBeInTheDocument();
  });

  it('forwards instruction edits through onChange', () => {
    const onChange = vi.fn();
    render(
      <FieldMappingModal
        isOpen
        onClose={() => undefined}
        mapping={basicMapping}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByLabelText('Front'), {
      target: { value: 'The vocab term' },
    });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0].fields[0].instruction).toBe(
      'The vocab term'
    );
  });

  it('closes when Done is clicked', () => {
    const onClose = vi.fn();
    render(
      <FieldMappingModal
        isOpen
        onClose={onClose}
        mapping={basicMapping}
        onChange={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
