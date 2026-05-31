import { describe, expect, test } from 'vitest';

import { ERROR_PAGE_SIZE, resolveErrorPage } from './errorPagination';

describe('resolveErrorPage', () => {
  test('first page of a single full page has no neighbours', () => {
    const info = resolveErrorPage(null, ERROR_PAGE_SIZE);

    expect(info).toEqual({
      page: 0,
      pageCount: 1,
      offset: 0,
      rangeStart: 1,
      rangeEnd: ERROR_PAGE_SIZE,
      hasPrev: false,
      hasNext: false,
    });
  });

  test('middle page exposes both neighbours and the correct offset', () => {
    const info = resolveErrorPage('1', 130, 50);

    expect(info).toMatchObject({
      page: 1,
      pageCount: 3,
      offset: 50,
      rangeStart: 51,
      rangeEnd: 100,
      hasPrev: true,
      hasNext: true,
    });
  });

  test('last partial page caps rangeEnd at the total and disables next', () => {
    const info = resolveErrorPage('2', 130, 50);

    expect(info).toMatchObject({
      page: 2,
      pageCount: 3,
      offset: 100,
      rangeStart: 101,
      rangeEnd: 130,
      hasPrev: true,
      hasNext: false,
    });
  });

  test('out-of-range page clamps to the last available page', () => {
    const info = resolveErrorPage('99', 130, 50);

    expect(info.page).toBe(2);
    expect(info.offset).toBe(100);
    expect(info.hasNext).toBe(false);
  });

  test('negative or non-numeric page falls back to the first page', () => {
    expect(resolveErrorPage('-3', 130, 50).page).toBe(0);
    expect(resolveErrorPage('abc', 130, 50).page).toBe(0);
  });

  test('zero results report an empty range and a single page', () => {
    const info = resolveErrorPage(null, 0, 50);

    expect(info).toMatchObject({
      page: 0,
      pageCount: 1,
      offset: 0,
      rangeStart: 0,
      rangeEnd: 0,
      hasPrev: false,
      hasNext: false,
    });
  });
});
