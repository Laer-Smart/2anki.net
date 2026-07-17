# 2anki CLI

Turn your notes into Anki decks, using a 2anki API key.

## Install (dev)

From the repo root:

```bash
pnpm cli -- <command>        # runs src/cli/index.ts via tsx
```

Once published, it runs as `2anki <command>`.

## Log in

```bash
2anki login
```

Opens the [Developers page](https://2anki.net/developers), where you create an
API key (shown once). Paste it back into the prompt. The key is stored in
`~/.2anki/config.json` with owner-only permissions. To skip the browser:

```bash
2anki login --key sk_live_…
```

Access to the Developers page is limited to lifetime accounts. Free and
subscriber accounts can request access from that page.

## Commands

| Command                | What it does                                           |
| ---------------------- | ------------------------------------------------------ |
| `2anki login`          | Connect an API key                                     |
| `2anki whoami`         | Show the account and keys this machine is connected to |
| `2anki convert <file>` | Convert a file into an Anki deck                       |
| `2anki logout`         | Remove the stored key from this machine                |
| `2anki help`           | Show help                                              |

## Configuration

| Env var              | Purpose                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| `TWOANKI_API_BASE`   | Point the CLI at a different API host (defaults to `https://2anki.net`) |
| `TWOANKI_CONFIG_DIR` | Override where the key is stored (defaults to `~/.2anki`)               |
| `NO_COLOR`           | Disable colored output                                                  |

## Notes

- The CLI authenticates with the same quota and plan as your account — an API
  key acts as you.
- `convert` uploads the file and waits for conversion. Headless `.apkg`
  download lands with the deck-download route once it accepts key auth; today
  the CLI points you at the web downloads page.
