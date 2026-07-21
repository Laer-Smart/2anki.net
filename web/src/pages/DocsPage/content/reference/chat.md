---
title: Chat — study assistant
description: Paste notes, ask for cards, work through a concept. Conversations are saved.
---

Chat is a study assistant built on Claude. Paste your notes and ask it to make cards, ask it to explain something, or work through a topic by going back and forth. Open it at [2anki.net/chat](https://2anki.net/chat). Sign-in required.

**Plan:** Free for the first 20 messages a month. Subscription and Lifetime are unlimited and use a stronger model.

## When to use this

- Your source isn't structured enough for the standard parser and you want to turn it into cards interactively.
- A standard upload returned too few cards (or none) and you want a second pass with a different angle.
- You want to think through a concept before making cards — explanation first, cards second.
- You're stuck on a specific upload error and want help working out why a file isn't converting.

If your source already maps cleanly to flashcards (toggles, bullet pairs, a spreadsheet), the standard [upload flow](/documentation/start-here/upload-a-file) is faster. Chat is for the in-between cases.

## Start a conversation

1. Open [2anki.net/chat](https://2anki.net/chat).
2. Either click one of the starter chips ("Make 10 cards from notes I'll paste", "Explain a concept, then make cards", "Turn this into cloze cards: [paste]") or type your own prompt.
3. Send. The assistant replies, streaming the response as it generates.
4. When the assistant proposes cards, you'll see them inline as front/back previews. You can keep iterating or download an `.apkg` from there.

Past conversations stay in the sidebar on the left. Click any to reopen. You can rename a conversation or delete it from the same row.

## Writing useful prompts

A clear prompt beats a long one. Three patterns that work:

**Paste your notes, then ask.** "Here are my notes on the citric acid cycle. Make 12 cards focused on enzymes and their products." — paste the notes after.

**Ask for explanation first.** "Explain why beta-blockers work in heart failure. Then make 5 cards from your explanation." — useful when you're not sure what the right questions are yet.

**Hand off a stuck upload.** If the upload page told you 0 cards were created, click **Open in chat** from the error. The conversation prefills with the filename and you can describe what's in the file.

The same advice that works for [AI flashcards](/documentation/cards/ai-flashcards) works here — be specific about what to focus on, what to skip, and what tone you want.

## Conversation limits

|                    | Free               | Subscription       | Lifetime           |
| ------------------ | ------------------ | ------------------ | ------------------ |
| Messages per month | 20                 | Unlimited          | Unlimited          |
| Message length     | 100 000 characters | 100 000 characters | 100 000 characters |
| Model              | Claude Haiku       | Claude Sonnet      | Claude Sonnet      |

The count resets on the first of the following month. The exact reset date shows up when you hit the limit. See [Limits and quotas](/documentation/help/limits) for the full plan table.

## What we store

- The text of every message in every conversation (so you can reopen them).
- The user account that owns the conversation.
- Nothing else — we don't run analytics on what you ask, and we don't train models on your conversations.

Delete a conversation any time using the trash icon in the sidebar. Deletion is immediate and final — the conversation can't be restored. For the full data picture, see the [privacy policy](/documentation/reference/privacy).

## Common mistakes

- **Pasting more than the message limit.** Each message caps at 100 000 characters. Split a longer source across multiple messages.
- **Expecting Chat to read uploaded files.** Chat reads text. To convert a PDF or a Notion export, use the [upload page](/documentation/start-here/upload-a-file) instead — that path is built for files. Chat can help you debug a stuck upload, but it doesn't process the file itself.
- **Treating Chat as the only path.** For source that already has structure, the standard parser is faster, deterministic, and free.

## Related

- [AI flashcards](/documentation/cards/ai-flashcards) — automatic Claude generation as part of upload, for files instead of pasted text
- [Limits and quotas](/documentation/help/limits) — message quotas by plan
- [Privacy policy](/documentation/reference/privacy) — what we store, what we don't
