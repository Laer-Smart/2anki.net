---
title: API access
description: The 2anki.net HTTP API — keys, endpoints, and the CLI.
---

The 2anki.net HTTP API is in a **limited beta**. Endpoints and payloads can still change between releases, but API keys, bearer authentication, and the core conversion endpoints are live and used by the [2anki CLI](https://www.npmjs.com/package/@2anki/cli).

## Access

Keys are self-service: sign in and create one on the [Developers page](/developers). Every key starts on the free Sandbox plan; paid plans raise the volume (see the tiers below).

Send your key as a bearer token on every request:

```
Authorization: Bearer sk_live_…
```

Keep the key secret. Anyone holding it can convert on your account, against your plan's limits.

## Tiers

| Tier    | Price    | Cards per month | Requests per minute |
| ------- | -------- | --------------- | ------------------- |
| Sandbox | free     | 100             | 5                   |
| Starter | $29 / mo | 5 000           | 30                  |
| Growth  | $99 / mo | 30 000          | 60                  |
| Custom  | contact  | above 100 000   | by arrangement      |

Every key starts on Sandbox. For Custom volume above 100 000 cards a month, email [support@2anki.net](mailto:support@2anki.net). See the [pricing page](/pricing) for the account plans.

## Endpoints

The endpoints a converter client needs:

| Method | Path                                    | What it does                    |
| ------ | --------------------------------------- | ------------------------------- |
| POST   | `https://2anki.net/api/upload/file`     | Convert a file into a deck      |
| GET    | `https://2anki.net/api/upload/jobs`     | Check conversion status         |
| GET    | `https://2anki.net/api/apkg/:key/meta`  | Deck preview — counts and decks |
| GET    | `https://2anki.net/api/apkg/:key/cards` | Rendered cards                  |

The full OpenAPI reference lives at [`/api/docs`](/api/docs) — a live Swagger UI generated from the running server. Anything not listed above should be treated as internal and may change without notice.

## The CLI

The [2anki CLI](https://www.npmjs.com/package/@2anki/cli) is the quickest way to use the API:

```
npx @2anki/cli login
2anki convert notes.md
```

Prebuilt binaries for macOS, Linux, and Windows are on the [releases page](https://github.com/2anki/server/releases/latest). The macOS binary is arm64 (Apple Silicon).

## Assistants

To use 2anki from Claude or ChatGPT instead of your own code, see the [MCP connector](/documentation/reference/mcp).

## Feedback

Use case not covered, or need more volume? Email [support@2anki.net](mailto:support@2anki.net) with what you're building — access is widened for real projects. Bugs go to [GitHub issues](https://github.com/2anki/server/issues).
