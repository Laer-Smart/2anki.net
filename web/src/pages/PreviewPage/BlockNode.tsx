import { useState } from 'react';
import { PreviewBlock } from '../../lib/backend/getPreviewBatch';
import { useBlockChildren } from './useBlockChildren';
import styles from './PreviewPage.module.css';

interface BlockNodeProps {
  block: PreviewBlock;
}

function isAutoContainer(type: string): boolean {
  return type === 'column_list' || type === 'column' || type === 'table';
}

export function BlockNode({ block }: Readonly<BlockNodeProps>) {
  const [open, setOpen] = useState(false);

  const autoExpand = block.canExpand && isAutoContainer(block.type);

  const { data, isLoading, error, refetch } = useBlockChildren(
    block.id,
    autoExpand || (open && block.hasChildren)
  );

  if (!block.canExpand) {
    return (
      <div
        // eslint-disable-next-line react/no-danger
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
        {isLoading && <p className={styles.muted}>Loading…</p>}
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
    );
  }

  return (
    <details
      className={styles.toggleBlock}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary
        className={styles.toggleSummary}
        // eslint-disable-next-line react/no-danger
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
