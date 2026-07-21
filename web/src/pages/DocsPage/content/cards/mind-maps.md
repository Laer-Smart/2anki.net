---
title: Mind maps
description: Build a tree in your browser and download it as an Anki deck.
---

The mind map editor at [2anki.net/mindmaps](https://2anki.net/mindmaps) lets you sketch a hierarchy in your browser — topics, sub-topics, nested concepts — and export it as a `.apkg` deck. The export modal lets you choose a card type before downloading.

**Plan:** Free accounts can have 3 saved maps and 50 nodes per map. Subscribers get 25 maps and 250 nodes per map. Lifetime and Auto Sync give unlimited maps and nodes.

## Build a deck

1. Open [2anki.net/mindmaps](https://2anki.net/mindmaps) and click **New map**.
2. Double-click the root node to name it (e.g. "Brachial plexus").
3. Select a node and press **Tab** to add a child, or **Enter** to add a sibling. Double-click or press **F2** to rename a node inline.
4. Keep going until the hierarchy reflects what you're studying.
5. Click **Download deck** in the right panel, give the deck a name, and confirm.
6. Open the `.apkg` in Anki.

## Keyboard model

| Key                | What it does                                                        |
| ------------------ | ------------------------------------------------------------------- |
| Tab                | Add a child node to the selected node                               |
| Enter              | Add a sibling node at the same level                                |
| Backspace          | Delete the selected node (confirmation required if it has children) |
| Double-click or F2 | Edit the node label inline                                          |

## How cards are generated

The export modal offers three card types. **Cloze** is the default.

### Cloze (default)

Each root-to-leaf path becomes one cloze card. Every node along the path — except the final leaf — is wrapped in a cloze deletion. The leaf is the context anchor that ties the path together.

A map with root **Science → Biology → Genetics** produces one card:

```
{{c1::Science}} → {{c2::Biology}} → Genetics
```

A star map — **Anatomy → Bone** and **Anatomy → Muscle** — produces two cards:

```
{{c1::Anatomy}} → Bone
{{c1::Anatomy}} → Muscle
```

The card count shown in the modal equals the number of leaf nodes (nodes with no children).

### Basic

Each **edge** (parent → child connection) becomes one Basic card: the parent label is the front, the child label is the back.

A simple star map — one root with three children — produces three cards:

- Root → Child A
- Root → Child B
- Root → Child C

A deeper tree produces one card per connection. The card count shown equals the number of edges.

Nodes with no edges (isolated nodes) produce no cards in either mode.

### Whole map

The entire tree becomes a single card. The back of the card displays an interactive, collapsible mind map rendered directly in Anki — no internet connection required. Pan and zoom to explore the tree while studying.

## Tiers

| Plan                 | Saved maps | Nodes per map |
| -------------------- | ---------- | ------------- |
| Free account         | 3          | 50            |
| Subscription         | 25         | 250           |
| Lifetime / Auto Sync | Unlimited  | Unlimited     |

Deleting a map frees a slot immediately; there is no monthly window. The editor shows a toast when you reach a cap.

## Images in nodes

You can add an image to any node. When exported, the image is embedded in the `.apkg` so Anki shows it on the card — no internet connection required during review.

**Paste an image (Cmd/Ctrl+V):** click anywhere on the canvas (not inside a text input), then paste. A new node appears at the center of the visible canvas with the image as its content.

**Drop an image file:** drag a file from your file manager and drop it anywhere on the canvas. The new node appears where you dropped it.

**Accepted formats:** PNG, JPEG, GIF, WebP. SVG is not accepted.

**Size limit:** 5 MB per image. Larger files are rejected.

**One image per node.** If you paste or drop a second image onto an existing node, the new image replaces the old one.

**Labels still work.** A node can have both an image and a text label. The label appears below the image in the editor and on the exported card.

## Import from OPML or Brainstorms

You can also convert existing outlines directly at [2anki.net/upload](https://2anki.net/upload) — no need to re-enter your content in the editor.

- **OPML** (`.opml`) — exported from OmniOutliner, iThoughtsX, or any outliner that supports OPML. Drop the file on the upload page.
- **Brainstorms JSON** (`.brainstorms.json`) — exported from Brainstorms (iOS/macOS) via the JSON export option. The filename must end in `.brainstorms.json`.

Each parent→child connection becomes one Basic card, using the same rule as the editor.

## What this is not

- The editor is desktop-only. On a phone or tablet, a banner explains this and no canvas loads.
- Maps are private. There are no sharing, embedding, or collaboration features in v1.
- XMind native `.xmind` format is not supported — export to OPML from XMind first.
- AI generation (map from a topic, cards from a map) is not available in v1.

## Related

- [Card types](/documentation/cards/card-types) — basic, cloze, input, MCQ
- [Limits and quotas](/documentation/help/limits) — what each plan includes
