import { useEffect, useRef, useState } from 'react';
import styles from './ConversationsSidebar.module.css';

export interface ConversationSummary {
  id: number;
  title: string;
  updatedAt: string;
}

interface Props {
  conversations: ConversationSummary[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onRename: (id: number, title: string) => void;
  onDelete: (id: number) => void;
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function ConversationsSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: Props) {
  const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (menuOpenFor == null) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current != null &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setMenuOpenFor(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpenFor]);

  useEffect(() => {
    if (renamingId != null) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingId]);

  function startRename(id: number, currentTitle: string) {
    setRenamingId(id);
    setRenameDraft(currentTitle);
    setMenuOpenFor(null);
  }

  function commitRename(id: number) {
    const next = renameDraft.trim();
    if (next.length > 0) {
      onRename(id, next);
    }
    setRenamingId(null);
    setRenameDraft('');
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameDraft('');
  }

  return (
    <aside className={styles.sidebar} aria-label="Conversations">
      <button type="button" className={styles.newChatBtn} onClick={onNew}>
        New chat
      </button>

      {conversations.length === 0 ? (
        <p className={styles.empty}>No conversations yet. Start one below.</p>
      ) : (
        <ul className={styles.list}>
          {conversations.map((c) => {
            const isActive = c.id === activeId;
            const isRenaming = c.id === renamingId;
            return (
              <li
                key={c.id}
                className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
              >
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    type="text"
                    className={styles.renameInput}
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={() => commitRename(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitRename(c.id);
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelRename();
                      }
                    }}
                    aria-label="Conversation title"
                  />
                ) : (
                  <button
                    type="button"
                    className={styles.itemMain}
                    onClick={() => onSelect(c.id)}
                    title={c.title}
                  >
                    <span className={styles.itemTitle}>{c.title}</span>
                    <span className={styles.itemMeta}>
                      {formatRelativeTime(c.updatedAt)}
                    </span>
                  </button>
                )}

                {!isRenaming && (
                  <div
                    className={styles.menuWrapper}
                    ref={menuOpenFor === c.id ? menuRef : undefined}
                  >
                    <button
                      type="button"
                      className={styles.menuTrigger}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenFor((prev) => (prev === c.id ? null : c.id));
                      }}
                      aria-label={`Options for ${c.title}`}
                      aria-haspopup="menu"
                      aria-expanded={menuOpenFor === c.id}
                    >
                      <span aria-hidden="true">⋯</span>
                    </button>

                    {menuOpenFor === c.id && (
                      <div className={styles.menu} role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          className={styles.menuItem}
                          onClick={() => startRename(c.id, c.title)}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className={`${styles.menuItem} ${styles.menuItemDanger}`}
                          onClick={() => {
                            setMenuOpenFor(null);
                            onDelete(c.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
