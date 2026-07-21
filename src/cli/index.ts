import { parseArgs } from './parseArgs';
import { login } from './commands/login';
import { logout } from './commands/logout';
import { whoami } from './commands/whoami';
import { convert } from './commands/convert';
import { info, ui } from './ui';

const HELP = `${ui.bold('2anki')} — turn your notes into Anki decks
${ui.dim('Create an API key at https://2anki.net/developers — free keys convert 100 cards/month')}

${ui.bold('Usage')}
  2anki <command> [options]

${ui.bold('Commands')}
  login            Connect an API key (opens the Developers page)
  logout           Remove the stored key from this machine
  whoami           Show the account this machine is connected to
  convert <file>   Convert a file into an Anki deck
  help             Show this help

${ui.bold('Options')}
  2anki login --key sk_live_…   Log in without the browser prompt

${ui.dim('Create keys at https://2anki.net/developers')}`;

export async function run(argv: string[]): Promise<number> {
  const { command, positionals, flags } = parseArgs(argv);
  switch (command) {
    case 'login':
      return login({
        key: typeof flags.key === 'string' ? flags.key : undefined,
      });
    case 'logout':
      return logout();
    case 'whoami':
      return whoami();
    case 'convert':
      return convert(positionals[0]);
    case 'help':
    case '--help':
    case '-h':
      info(HELP);
      return 0;
    default:
      info(HELP);
      return command === 'help' ? 0 : 1;
  }
}
