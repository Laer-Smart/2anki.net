import { NavLink } from 'react-router-dom';
import { findGroupForSlug, sidebar } from './sidebar';
import { DocsSearchTrigger } from './DocsSearchTrigger';
import styles from './DocsPage.module.css';

interface DocsSidebarProps {
  onNavigate?: () => void;
  onSearch?: () => void;
  isDrawer?: boolean;
  activeSlug?: string;
}

export function DocsSidebar({
  onNavigate,
  onSearch,
  isDrawer,
  activeSlug,
}: Readonly<DocsSidebarProps>) {
  const activeGroupLabel = activeSlug
    ? findGroupForSlug(activeSlug)?.label
    : undefined;

  return (
    <nav
      className={`${styles.sidebar} ${isDrawer ? styles.sidebarDrawer : ''}`}
      aria-label="Documentation"
    >
      {onSearch && <DocsSearchTrigger onOpen={onSearch} />}
      {sidebar.map((group) => {
        const isActiveGroup = group.label === activeGroupLabel;
        return (
          <div key={group.label} className={styles.sidebarGroup}>
            <div className={styles.sidebarGroupLabel}>{group.label}</div>
            <ul
              className={`${styles.sidebarList} ${
                isActiveGroup ? styles.sidebarListActive : ''
              }`}
            >
              {group.items.map((item) => (
                <li key={item.slug}>
                  {item.href ? (
                    <a
                      href={item.href}
                      className={styles.sidebarLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <NavLink
                      to={`/documentation/${item.slug}`}
                      className={({ isActive }) =>
                        `${styles.sidebarLink} ${
                          isActive ? styles.sidebarLinkActive : ''
                        }`
                      }
                      onClick={onNavigate}
                      end
                    >
                      {item.label}
                    </NavLink>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
