import { toPreviewBlock } from './toPreviewBlock';
import { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';

const DEFAULT_RULES = { flashcardTypes: ['toggle'] };

function makeBlock(
  overrides: Partial<BlockObjectResponse>
): BlockObjectResponse {
  return {
    object: 'block',
    id: 'test-block-id',
    parent: { type: 'page_id', page_id: 'parent-page-id' },
    created_time: '2024-01-01T00:00:00.000Z',
    last_edited_time: '2024-01-01T00:00:00.000Z',
    created_by: { object: 'user', id: 'user-id' },
    last_edited_by: { object: 'user', id: 'user-id' },
    has_children: false,
    archived: false,
    in_trash: false,
    ...overrides,
  } as unknown as BlockObjectResponse;
}

describe('toPreviewBlock', () => {
  it('returns decision=card for a toggle block with default rules', () => {
    const block = makeBlock({
      id: 'toggle-id',
      type: 'toggle',
      toggle: { rich_text: [], color: 'default' },
      has_children: true,
    } as unknown as Partial<BlockObjectResponse>);

    const result = toPreviewBlock(block, DEFAULT_RULES);

    expect(result.decision).toBe('card');
    expect(result.id).toBe('toggle-id');
    expect(result.type).toBe('toggle');
    expect(result.canExpand).toBe(true);
  });

  it('returns decision=skip for a paragraph with default rules', () => {
    const block = makeBlock({
      id: 'para-id',
      type: 'paragraph',
      paragraph: { rich_text: [], color: 'default' },
    } as unknown as Partial<BlockObjectResponse>);

    const result = toPreviewBlock(block, DEFAULT_RULES);

    expect(result.decision).toBe('skip');
    expect(result.canExpand).toBe(false);
  });

  it('returns decision=recurse and sets childPageId/childPageTitle for child_page', () => {
    const block = makeBlock({
      id: 'child-page-id',
      type: 'child_page',
      child_page: { title: 'My Sub Page' },
    } as unknown as Partial<BlockObjectResponse>);

    const result = toPreviewBlock(block, DEFAULT_RULES);

    expect(result.decision).toBe('recurse');
    expect(result.childPageId).toBe('child-page-id');
    expect(result.childPageTitle).toBe('My Sub Page');
  });

  it('sets childPageTitle to undefined when child_page title is empty', () => {
    const block = makeBlock({
      id: 'child-page-id',
      type: 'child_page',
      child_page: { title: '' },
    } as unknown as Partial<BlockObjectResponse>);

    const result = toPreviewBlock(block, DEFAULT_RULES);

    expect(result.childPageTitle).toBeUndefined();
  });

  it('does not set childPageId/childPageTitle for non-child_page blocks', () => {
    const block = makeBlock({
      id: 'para-id',
      type: 'paragraph',
      paragraph: { rich_text: [], color: 'default' },
    } as unknown as Partial<BlockObjectResponse>);

    const result = toPreviewBlock(block, DEFAULT_RULES);

    expect(result.childPageId).toBeUndefined();
    expect(result.childPageTitle).toBeUndefined();
  });

  it('returns decision=card for toggleable heading_1 with default rules', () => {
    const block = makeBlock({
      id: 'h1-id',
      type: 'heading_1',
      heading_1: {
        rich_text: [],
        color: 'default',
        is_toggleable: true,
      },
      has_children: true,
    } as unknown as Partial<BlockObjectResponse>);

    const result = toPreviewBlock(block, DEFAULT_RULES);

    expect(result.decision).toBe('card');
    expect(result.canExpand).toBe(true);
  });

  it('returns decision=skip for non-toggleable heading_1 with default rules', () => {
    const block = makeBlock({
      id: 'h1-id',
      type: 'heading_1',
      heading_1: {
        rich_text: [],
        color: 'default',
        is_toggleable: false,
      },
    } as unknown as Partial<BlockObjectResponse>);

    const result = toPreviewBlock(block, DEFAULT_RULES);

    expect(result.decision).toBe('skip');
  });
});
