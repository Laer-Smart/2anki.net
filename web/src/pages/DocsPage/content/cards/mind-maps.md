---
title: Mind maps
description: Build a tree in your browser and download it as an Anki deck.
---

The mind map editor at [2anki.net/mindmaps](https://2anki.net/mindmaps) lets you sketch a hierarchy in your browser — topics, sub-topics, nested concepts — and export it as a `.apkg` deck. Each edge in the map becomes one flashcard: the parent node is the front, the child node is the back.

**Plan:** Free accounts can have 3 saved maps and 50 nodes per map. Auto-Sync ($30/mo) and Patreon lifetime give unlimited maps and nodes.

## Build a deck

1. Open [2anki.net/mindmaps](https://2anki.net/mindmaps) and click **New map**.
2. Double-click the root node to name it (e.g. "Brachial plexus").
3. Select a node and press **Tab** to add a child, or **Enter** to add a sibling. Double-click or press **F2** to rename a node inline.
4. Keep going until the hierarchy reflects what you're studying.
5. Click **Download deck** in the right panel, give the deck a name, and confirm.
6. Open the `.apkg` in Anki.

## Keyboard model

| Key | What it does |
|-----|-------------|
| Tab | Add a child node to the selected node |
| Enter | Add a sibling node at the same level |
| Backspace | Delete the selected node (confirmation required if it has children) |
| Double-click or F2 | Edit the node label inline |

## How cards are generated

Each **edge** (parent → child connection) becomes one Basic card: the parent label is the front, the child label is the back.

A simple star map — one root with three children — produces three cards:
- Root → Child A
- Root → Child B
- Root → Child C

A deeper tree produces one card per connection. Nodes with no edges (isolated nodes) do not produce cards.

## Free-tier limits

- **3 saved maps.** Deleting a map frees a slot immediately; there is no monthly window.
- **50 nodes per map.** The editor shows a toast when you reach the cap. Paid accounts have no node limit.

## What this is not

- The editor is desktop-only. On a phone or tablet, a banner explains this and no canvas loads.
- Maps are private. There are no sharing, embedding, or collaboration features in v1.
- There is no import from OPML, XMind, or Obsidian — maps are built in the editor.
- AI generation (map from a topic, cards from a map) is not available in v1.

## Related

- [Card types](/documentation/cards/card-types) — basic, cloze, input, MCQ
- [Limits and quotas](/documentation/help/limits) — what each plan includes
