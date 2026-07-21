---
title: API access
description: The 2anki.net HTTP API — keys, endpoints, and the CLI.
---

The 2anki.net HTTP API is in a **limited beta**. Endpoints and payloads can still change between releases, but API keys, bearer authentication, and the core conversion endpoints are live and used by the [2anki CLI](https://www.npmjs.com/package/@2anki/cli).

## Access

Keys are managed on the [Developers page](/developers). Lifetime accounts have access already; everyone else can request it from the same page and accounts are enabled by email.

Send your key as a bearer token on every request:

```
Authorization: Bearer sk_live_…
```

Keep the key secret. Anyone holding it can convert on your account, against your plan's limits.

## Endpoints

The endpoints a converter client needs:

| Method | Path                   | What it does                    |
| ------ | ---------------------- | ------------------------------- |
| POST   | `/api/upload/file`     | Convert a file into a deck      |
| GET    | `/api/upload/jobs`     | Check conversion status         |
| GET    | `/api/apkg/:key/meta`  | Deck preview — counts and decks |
| GET    | `/api/apkg/:key/cards` | Rendered cards                  |

The full OpenAPI reference lives at [`/api/docs`](/api/docs) — a live Swagger UI generated from the running server. Anything not listed above should be treated as internal and may change without notice.

## The CLI

The [2anki CLI](https://www.npmjs.com/package/@2anki/cli) is the quickest way to use the API:

```
npx @2anki/cli login
2anki convert notes.md
```

Prebuilt binaries for macOS, Linux, and Windows are on the [releases page](https://github.com/2anki/server/releases/latest).

## Assistants

To use 2anki from Claude or ChatGPT instead of your own code, see the [MCP connector](/documentation/reference/mcp).

## Feedback

Use case not covered, or need more volume? Email [support@2anki.net](mailto:support@2anki.net) with what you're building — access is widened for real projects. Bugs go to [GitHub issues](https://github.com/2anki/server/issues).
