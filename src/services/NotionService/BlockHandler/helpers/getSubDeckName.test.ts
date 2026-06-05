import getSubDeckName from './getSubDeckName';
import {
  BULLETED_LIST_MOCK,
  CHILD_PAGE_MOCK,
  EMPTY_BULLETED_LIST_MOCK,
  HEADING_MOCK,
  NUMBERED_LIST_MOCK,
} from './mocks';

describe('getSubDeckName', () => {
  it.each([
    ['name from title', { title: 'cool' }, 'cool'],
    ['child page', CHILD_PAGE_MOCK, 'Basic blocks'],
    ['heading', HEADING_MOCK, 'Blocks'],
    ['bulleted list item', BULLETED_LIST_MOCK, 'First chapter'],
    ['numbered list item', NUMBERED_LIST_MOCK, 'Step one'],
    [
      'bulleted list item with empty rich text',
      EMPTY_BULLETED_LIST_MOCK,
      'Untitled',
    ],
  ])('%s', (_, input, expected) => {
    expect(getSubDeckName(input)).toBe(expected);
  });
});
