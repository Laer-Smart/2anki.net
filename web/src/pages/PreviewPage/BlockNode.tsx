import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PreviewBlock } from '../../lib/backend/getPreviewBatch';
import { BlockDecision } from '../../lib/preview/classifyBlock';
import { useBlockChildren } from './useBlockChildren';
import styles from './PreviewPage.module.css';

interface BlockNodeProps {
  block: PreviewBlock;
}

const DECISION_TOOLTIPS: Record<BlockDecision, string> = {
  card: 'This block becomes a card',
  skip: 'Skipped — not converted',
  recurse: 'Opens as a sub-page — click to explore',
};

function decisionClass(decision: BlockDecision | undefined): string {
  if (decision === 'card') return styles.blockCard;
  if (decision === 'skip') return styles.blockSkip;
  if (decision === 'recurse') return styles.blockRecurse;
  return styles.blockRow;
}

export function BlockNode({ block }: Readonly<BlockNodeProps>) {
  const [open, setOpen] = useState(false);

  const { data, isLoading, error, refetch } = useBlockChildren(
    block.id,
    open && block.hasChildren
  );

  const rowClass = decisionClass(block.decision);
  const tooltipText = block.decision ? DECISION_TOOLTIPS[block.decision] : undefined;

  if (block.type === 'child_page' && block.childPageId != null) {
    return (
      <div className={rowClass} title={tooltipText}>
        <div className={styles.subPageRow}>
          <Link
            to={`/preview/${block.childPageId}`}
            className={styles.subPageLink}
            state={{ parentTitle: block.childPageTitle }}
          >
            <span
              dangerouslySetInnerHTML={{ __html: block.html }}
            />
          </Link>
          <span className={styles.subPageLabel}>
            Sub-page <span className={styles.subPageChevron}>&rsaquo;</span>
          </span>
        </div>
      </div>
    );
  }

  if (!block.canExpand) {
    return (
      <div
        className={rowClass}
        title={tooltipText}
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
    );
  }

  const children = data?.pages.flatMap((page) => page.blocks) ?? [];

  return (
    <details
      className={`${styles.toggleBlock} ${rowClass}`}
      title={tooltipText}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary
        className={styles.toggleSummary}
        dangerouslySetInnerHTML={{ __html: block.summaryHtml ?? '' }}
      />
      {open && (
        <div className={styles.toggleChildren}>
          {!block.hasChildren && (
            <p className={styles.muted}>
              <em>This toggle has no children.</em>
            </p>
          )}
          {isLoading && <p className={styles.muted}>Loading children…</p>}
          {error && (
            <p className={styles.muted}>
              Couldn&apos;t load children.{' '}
              <button
                type="button"
                className={styles.retryButton}
                onClick={() => refetch()}
              >
                Try again
              </button>
            </p>
          )}
          {children.map((child) => (
            <BlockNode key={child.id} block={child} />
          ))}
        </div>
      )}
    </details>
  );
}
