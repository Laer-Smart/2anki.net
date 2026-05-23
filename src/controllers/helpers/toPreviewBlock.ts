import { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import {
  isExpandable,
  renderBlockPreview,
  renderBlockSummary,
} from '../../services/NotionService/helpers/renderBlockPreview';
import {
  classifyBlock,
  BlockDecision,
  ClassifyRules,
} from '../../lib/parser/intent/classifyBlock';
import { isToggleHeading } from '../../services/NotionService/helpers/isToggleHeading';

export interface PreviewBlockPayload {
  id: string;
  type: string;
  hasChildren: boolean;
  canExpand: boolean;
  html: string;
  summaryHtml?: string;
  decision: BlockDecision;
  childPageId?: string;
  childPageTitle?: string;
}

export function toPreviewBlock(
  block: BlockObjectResponse,
  rules: ClassifyRules
): PreviewBlockPayload {
  const canExpand = isExpandable(block);
  const decision = classifyBlock(
    { type: block.type, hasToggleableHeading: isToggleHeading(block) },
    rules
  );

  const base: PreviewBlockPayload = {
    id: block.id,
    type: block.type,
    hasChildren: block.has_children === true,
    canExpand,
    html: canExpand ? '' : renderBlockPreview(block),
    summaryHtml: canExpand ? renderBlockSummary(block) : undefined,
    decision,
  };

  if (block.type === 'child_page') {
    base.childPageId = block.id;
    base.childPageTitle = block.child_page.title || undefined;
  }

  return base;
}
