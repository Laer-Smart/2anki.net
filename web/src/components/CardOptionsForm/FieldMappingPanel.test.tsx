import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FieldMappingPanel } from './FieldMappingPanel';
import type { FieldMapping } from '../../lib/cardFields/types';

const basicMapping: FieldMapping = {
  templateName: 'n2a-basic',
  fields: [
    { name: 'Front', instruction: 'The question or term' },
    { name: 'Back', instruction: 'The answer or definition' },
  ],
};

describe('FieldMappingPanel', () => {
  it('renders a label and input for each field', () => {
    render(<FieldMappingPanel mapping={basicMapping} onChange={() => undefined} />);
    expect(screen.getByLabelText('Front')).toBeDefined();
    expect(screen.getByLabelText('Back')).toBeDefined();
  });

  it('displays the current instruction value in each input', () => {
    render(<FieldMappingPanel mapping={basicMapping} onChange={() => undefined} />);
    const frontInput = screen.getByLabelText('Front') as HTMLInputElement;
    expect(frontInput.value).toBe('The question or term');
  });

  it('calls onChange with updated instruction when a field input changes', () => {
    const handleChange = vi.fn();
    render(<FieldMappingPanel mapping={basicMapping} onChange={handleChange} />);
    const frontInput = screen.getByLabelText('Front');
    fireEvent.change(frontInput, { target: { value: 'The vocab term' } });
    expect(handleChange).toHaveBeenCalledOnce();
    const updated: FieldMapping = handleChange.mock.calls[0][0];
    expect(updated.fields[0].instruction).toBe('The vocab term');
    expect(updated.fields[1].instruction).toBe('The answer or definition');
  });

  it('preserves templateName when a field changes', () => {
    const handleChange = vi.fn();
    render(<FieldMappingPanel mapping={basicMapping} onChange={handleChange} />);
    fireEvent.change(screen.getByLabelText('Front'), { target: { value: 'x' } });
    const updated: FieldMapping = handleChange.mock.calls[0][0];
    expect(updated.templateName).toBe('n2a-basic');
  });
});
