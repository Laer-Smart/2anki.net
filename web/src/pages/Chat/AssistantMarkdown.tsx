import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';
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
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const match = /language-(\w+)/.exec(className ?? '');
    const isBlock = className != null;
    if (isBlock) {
      const code = String(children).replace(/\n$/, '');
      const lang = match == null ? '' : match[1];
      return <CodeBlock language={lang} code={code} />;
    }
    return <code className={className}>{children}</code>;
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
