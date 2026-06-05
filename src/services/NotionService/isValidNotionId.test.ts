import { isValidNotionId } from './isValidNotionId';

describe('isValidNotionId', () => {
  it('accepts a dashed UUID', () => {
    expect(isValidNotionId('34440b54-5033-80e7-829e-f1e74c5295fd')).toBe(true);
  });

  it('accepts a 32-hex undashed id', () => {
    expect(isValidNotionId('34440b545033801a829ef1e74c5295fd')).toBe(true);
  });

  it('is case-insensitive on hex', () => {
    expect(isValidNotionId('34440B54-5033-80E7-829E-F1E74C5295FD')).toBe(true);
  });

  it('rejects plain text (a leaked page title)', () => {
    expect(isValidNotionId('03 Obstructive pulmonary disease')).toBe(false);
    expect(isValidNotionId('lecture 11: ciliary body & accom')).toBe(false);
  });

  it('rejects empty / non-string values', () => {
    expect(isValidNotionId('')).toBe(false);
    expect(isValidNotionId(undefined)).toBe(false);
    expect(isValidNotionId(null)).toBe(false);
    expect(isValidNotionId(42 as unknown)).toBe(false);
  });

  it('rejects almost-UUIDs', () => {
    expect(isValidNotionId('34440b54-5033-80e7-829e-f1e74c5295f')).toBe(false);
    expect(isValidNotionId('34440b54-5033-80e7-829e-f1e74c5295fdff')).toBe(
      false
    );
    expect(isValidNotionId('34440b54_5033_80e7_829e_f1e74c5295fd')).toBe(false);
  });
});
