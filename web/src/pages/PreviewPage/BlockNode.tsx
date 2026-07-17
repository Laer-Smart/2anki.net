import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BlockDecision, PreviewBlock } from '../../lib/backend/getPreviewBatch';
import { useBlockChildren } from './useBlockChildren';
import styles from './PreviewPage.module.css';

interface BlockNodeProps {
  block: PreviewBlock;
  parentTitle?: string;
}

const DECISION_TOOLTIP_KEYS: Record<BlockDecision, string> = {
  card: 'block.tooltipCard',
  skip: 'block.tooltipSkip',
  recurse: 'block.tooltipRecurse',
};

function decisionClass(decision: BlockDecision | undefined): string {
  if (decision === 'card') return styles.blockCard;
  if (decision === 'skip') return styles.blockSkip;
  if (decision === 'recurse') return styles.blockRecurse;
  return styles.blockRow;
}

function isAutoContainer(type: string): boolean {
  return type === 'column_list' || type === 'column' || type === 'table';
}

export function BlockNode({ block, parentTitle }: Readonly<BlockNodeProps>) {
  const { t } = useTranslation('previews');
  const [open, setOpen] = useState(false);

  const autoExpand = block.canExpand && isAutoContainer(block.type);

  const { data, isLoading, error, refetch } = useBlockChildren(
    block.id,
    autoExpand || (open && block.hasChildren)
  );

  const rowClass = decisionClass(block.decision);
  const tooltipText = block.decision
    ? t(DECISION_TOOLTIP_KEYS[block.decision])
    : undefined;

  if (block.type === 'child_page' && block.childPageId != null) {
    return (
      <Link
        to={`/preview/${block.childPageId}`}
        className={`${rowClass} ${styles.subPageRow}`}
        title={tooltipText}
        state={{ parentTitle }}
      >
        <span dangerouslySetInnerHTML={{ __html: block.html }} />
        <span className={styles.subPageLabel}>
          {t('block.subPage')}{' '}
          <span className={styles.subPageChevron}>&rsaquo;</span>
        </span>
      </Link>
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

  if (autoExpand) {
    return (
      <div className={styles.containerBlock}>
        {block.summaryHtml && (
          <span
            className={styles.containerLabel}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: block.summaryHtml }}
          />
        )}
        {isLoading && <p className={styles.muted}>{t('block.loading')}</p>}
        {error && (
          <p className={styles.muted}>
            {t('block.loadChildrenFailed')}{' '}
            <button
              type="button"
              className={styles.retryButton}
              onClick={() => refetch()}
            >
              {t('block.tryAgain')}
            </button>
          </p>
        )}
        {children.map((child) => (
          <BlockNode key={child.id} block={child} parentTitle={parentTitle} />
        ))}
      </div>
    );
  }

  return (
    <details
      className={`${styles.toggleBlock} ${rowClass}`}
      title={tooltipText}
      onToggle={(event) =>
        setOpen((event.currentTarget as HTMLDetailsElement).open)
      }
    >
      <summary
        className={styles.toggleSummary}
        dangerouslySetInnerHTML={{ __html: block.summaryHtml ?? '' }}
      />
      {open && (
        <div className={styles.toggleChildren}>
          {!block.hasChildren && (
            <p className={styles.muted}>
              <em>{t('block.noChildren')}</em>
            </p>
          )}
          {isLoading && (
            <p className={styles.muted}>{t('block.loadingChildren')}</p>
          )}
          {error && (
            <p className={styles.muted}>
              {t('block.loadChildrenFailed')}{' '}
              <button
                type="button"
                className={styles.retryButton}
                onClick={() => refetch()}
              >
                {t('block.tryAgain')}
              </button>
            </p>
          )}
          {children.map((child) => (
            <BlockNode key={child.id} block={child} parentTitle={parentTitle} />
          ))}
        </div>
      )}
    </details>
  );
}
