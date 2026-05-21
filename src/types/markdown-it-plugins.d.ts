declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it';
  const plugin: MarkdownIt.PluginSimple;
  export = plugin;
}

declare module 'markdown-it-multimd-table' {
  import type MarkdownIt from 'markdown-it';
  interface MultimdTableOptions {
    enableMultilineRows?: boolean;
    enableRowspan?: boolean;
    enableMultiBody?: boolean;
  }
  const plugin: MarkdownIt.PluginWithOptions<MultimdTableOptions>;
  export = plugin;
}
