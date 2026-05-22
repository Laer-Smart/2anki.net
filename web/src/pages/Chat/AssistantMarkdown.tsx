import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './AssistantMarkdown.module.css';

const components: Components = {
  a: ({ href, children, ...rest }) => {
    const safe =
      href != null &&
      (href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:'));
    return (
      <a
        href={safe ? href : undefined}
        target="_blank"
        rel="noopener noreferrer"
        {...rest}
      >
        {children}
      </a>
    );
  },
};

const plugins = [remarkGfm];

export default function AssistantMarkdown({
  children,
  isStreaming,
}: {
  children: string;
  isStreaming?: boolean;
}) {
  return (
    <div className={styles.prose}>
      <ReactMarkdown remarkPlugins={plugins} components={components}>
        {children}
      </ReactMarkdown>
      {isStreaming === true && (
        <span className={styles.streamingCaret} aria-hidden="true" />
      )}
    </div>
  );
}
