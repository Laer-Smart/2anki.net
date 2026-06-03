import fs from 'fs';
import path from 'path';

export const NOTION_STYLE = fs.readFileSync(
  path.join(__dirname, './notion.css'),
  'utf8'
);

const CODE_THEME_FILES: Record<string, string> = {
  github: 'github.css',
  'one-dark': 'one-dark.css',
  solarized: 'solarized.css',
  dracula: 'dracula.css',
};

const DEFAULT_CODE_THEME = 'github';

const CODE_THEME_CSS: Record<string, string> = Object.fromEntries(
  Object.entries(CODE_THEME_FILES).map(([name, file]) => [
    name,
    fs.readFileSync(path.join(__dirname, 'hljs-themes', file), 'utf8'),
  ])
);

export function getCodeThemeCss(name: string): string {
  return CODE_THEME_CSS[name] ?? CODE_THEME_CSS[DEFAULT_CODE_THEME];
}
