export interface ParsedArgs {
  command: string;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

/**
 * Minimal argv parser: `2anki <command> [positionals] [--flag value | --flag]`.
 * Dependency-free on purpose — the CLI ships no third-party arg library.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  // `pnpm cli -- convert x` / `npx pkg -- convert x` forward a literal `--` as
  // the first token; drop it so the command is read correctly.
  const normalized = argv[0] === '--' ? argv.slice(1) : argv;
  const [command = 'help', ...rest] = normalized;
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token.startsWith('--')) {
      const name = token.slice(2);
      const next = rest[i + 1];
      if (next != null && !next.startsWith('--')) {
        flags[name] = next;
        i += 1;
      } else {
        flags[name] = true;
      }
    } else {
      positionals.push(token);
    }
  }

  return { command, positionals, flags };
}
