import { parseArgs } from './parseArgs';

describe('parseArgs', () => {
  it('defaults to help with no args', () => {
    expect(parseArgs([]).command).toBe('help');
  });

  it('reads a command and positionals', () => {
    const parsed = parseArgs(['convert', 'notes.md']);
    expect(parsed.command).toBe('convert');
    expect(parsed.positionals).toEqual(['notes.md']);
  });

  it('reads a flag with a value', () => {
    const parsed = parseArgs(['login', '--key', 'sk_live_abc']);
    expect(parsed.command).toBe('login');
    expect(parsed.flags.key).toBe('sk_live_abc');
  });

  it('treats a trailing flag without a value as a boolean', () => {
    const parsed = parseArgs(['whoami', '--json']);
    expect(parsed.flags.json).toBe(true);
  });
});
