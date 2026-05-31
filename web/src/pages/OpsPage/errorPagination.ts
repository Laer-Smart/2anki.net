export const ERROR_PAGE_SIZE = 50;

export interface ErrorPageInfo {
  page: number;
  pageCount: number;
  offset: number;
  rangeStart: number;
  rangeEnd: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export function resolveErrorPage(
  rawPage: string | null,
  totalGroups: number,
  pageSize: number = ERROR_PAGE_SIZE
): ErrorPageInfo {
  const parsed = Number(rawPage);
  const requested = Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
  const pageCount = Math.max(1, Math.ceil(totalGroups / pageSize));
  const page = Math.min(requested, pageCount - 1);
  const offset = page * pageSize;
  const rangeStart = totalGroups === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + pageSize, totalGroups);

  return {
    page,
    pageCount,
    offset,
    rangeStart,
    rangeEnd,
    hasPrev: page > 0,
    hasNext: page < pageCount - 1,
  };
}
