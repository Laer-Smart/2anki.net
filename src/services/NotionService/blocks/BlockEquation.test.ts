import BlockEquation, { renderDisplayEquation } from './BlockEquation';
import { EquationBlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';

function makeEquationBlock(expression: string): EquationBlockObjectResponse {
  return {
    object: 'block',
    id: 'be5503f9-7544-460d-a500-fdc3c04431e8',
    parent: {
      type: 'block_id',
      block_id: '0d75beab-5fbe-46b3-aeaa-bc64e765bb41',
    },
    created_time: '2022-12-25T19:32:00.000Z',
    last_edited_time: '2022-12-25T19:32:00.000Z',
    created_by: {
      object: 'user',
      id: 'aa',
    },
    last_edited_by: {
      object: 'user',
      id: 'aa',
    },
    has_children: false,
    archived: false,
    type: 'equation',
    equation: { expression },
  } as EquationBlockObjectResponse;
}

describe('BlockEquation', () => {
  test('MathJax transform', () => {
    const expected = '\\(\\sqrt{x}\\)';
    expect(BlockEquation(makeEquationBlock('\\sqrt{x}'))).toBe(expected);
  });

  test('renderDisplayEquation wraps in display delimiters', () => {
    expect(renderDisplayEquation(makeEquationBlock('\\sqrt{x}'))).toBe(
      '\\[\\sqrt{x}\\]'
    );
  });
});
