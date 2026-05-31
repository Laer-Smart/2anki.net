import {
  EquationBlockObjectResponse,
  EquationRichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';

type EquationBlock =
  | EquationBlockObjectResponse
  | EquationRichTextItemResponse;

export function renderInlineEquation(block: EquationBlock): string {
  const { expression } = block.equation;
  return `\\(${expression}\\)`;
}

export function renderDisplayEquation(block: EquationBlock): string {
  const { expression } = block.equation;
  return `\\[${expression}\\]`;
}

export default renderInlineEquation;
