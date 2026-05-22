# Spec: Paste / drop images into mind map nodes

Allow users to paste or drop image files into the mind map canvas. Images become first-class node content alongside markdown text, render inline on the canvas, persist with the map, and embed as media in the exported `.apkg` so cards display the image in Anki.

## Why

Med students (the primary mind-map persona) study from PDFs and slide decks. Anatomy, biochemistry, and pathology decks lean heavily on diagrams. Today the editor accepts text only — the user has to leave 2anki, save the image, upload it separately to an Anki card, then come back. That round-trip is the gap. Pasting an image straight into a node closes it.

This is the second-largest unlock after position persistence (which #2596 already shipped). Without images, mind maps remain a notes-only surface in a deeply visual domain.

## Persona and JTBD

Same persona as the rest of the mind map work (second-year med student studying anatomy).

**Job:** "When I'm building a brachial-plexus map, I want to drop a diagram into a node so the resulting flashcard shows the image alongside the label — because cards with text only don't help me when the question is *what does this look like*."

## In scope (v1)

- **Paste an image** from the clipboard (Cmd/Ctrl+V) onto the canvas → new node spawns at the center of the visible canvas with the image as its content.
- **Drop an image file** onto the canvas → same behavior at the drop position.
- **Paste an image while a node is selected** → the image becomes the selected node's content (overwriting its label).
- Node renders the `<img>` inline; existing markdown text-rendering still works for text-typed nodes.
- Image stored on the server, referenced by URL on the node.
- Export pipeline embeds the image as media in the `.apkg` so Anki renders it.
- Free-tier limit: same 50-node ceiling. No separate image-count limit. The 100-cards-per-month limit (the existing free-tier conversion cap) continues to govern the export step downstream.
- Max image size per file: **5 MB** (matches the existing upload pipeline limit for other formats).
- Accepted formats: `image/png`, `image/jpeg`, `image/gif`, `image/webp`. SVG explicitly excluded (XSS surface).

## Out of scope (v1)

- Resizing the image inside the node (the existing NodeResizer handles the node frame; image scales to fit).
- Image cropping / editing.
- Multiple images per node — one image per node, the second paste replaces the first.
- Pasting raw image data URLs (data URIs in the markdown). The data field stays a server URL.
- Compression / format conversion server-side.
- Drag-rearrange images between nodes.
- Dropping a folder of images.

## Data shape

`MindmapData.nodes[i]` gains one optional field:

```ts
{ id, label, position?, width?, height?, color?, image?: { url: string; width: number; height: number } }
```

`label` stays the source of truth for text. `image`, when present, renders above the label and below the node toolbar. Both can coexist (image with a caption); leaving `label` empty produces an image-only node.

## UI / UX

- **Paste anywhere on the canvas (not in an editable input)** with image data on the clipboard: image uploads, new node spawns at viewport center with the image. Existing text-paste behavior in `MindmapEditor.tsx` already runs in a document-level paste listener — extend it to detect `clipboardData.items` for `kind === 'file'` with `type.startsWith('image/')`.
- **Drop an image file** on the canvas: spawn at the drop point (via `screenToFlowPosition`). Bind to `onDrop` on the canvas wrapper.
- **Paste while a node is selected**: image becomes that node's content. Existing label is preserved (renders as a caption underneath).
- **Upload in progress**: the new node renders with a small spinner overlay until the upload returns. If upload fails, show a toast `Couldn't upload that image. Try again.` and remove the placeholder node.
- **Toast on success**: none — the image rendering is its own feedback.
- **Side-panel hint added**: `Paste or drop an image — drops a new image node`.

## Technical approach

**Storage decision:** disk under the user's existing per-user upload directory. The product already stores other uploaded files this way; S3 is reserved for the apkg pipeline where deploy-side persistence matters. Mind-map images are a deletable per-user asset; if the user deletes the map, we can prune. Revisit S3 if storage growth crosses a threshold.

**Server:**

- New use case `src/usecases/mindmaps/UploadMindmapImageUseCase.ts` — input: multer file + userId; output: `{ url, width, height }`.
- New route `POST /api/mindmaps/:id/images` — multipart/form-data, single field `image`. Behind `RequireAuthentication`. Caps file size at 5 MB via multer config. Rejects non-image MIME types. Stores under `uploads/<userId>/mindmaps/<mapId>/<uuid>.<ext>`. Returns the public URL.
- `MindmapController` gets `uploadImage(req, res)`.
- The image dimensions come from `sharp` or `image-size` (verify which is already a dep with `pnpm why sharp`); needed so the client renders the node at a sensible aspect ratio before the image loads.

**Web:**

- `useMindmap.ts` — new `uploadMindmapImage(mapId: string, file: File)` helper that POSTs the multipart form.
- `MindmapEditor.tsx`:
  - Extend the paste listener to handle image clipboard items.
  - Add an `onDrop` handler on the canvas wrapper (with matching `onDragOver` for the cursor).
  - Helper `createImageNode(position, file)` that calls `uploadMindmapImage`, then creates the node when the URL returns. Shows a placeholder node with spinner while waiting.
- `MindmapNode.tsx` — when `data.image != null`, render `<img src={data.image.url}>` above the Markdown label. Image inherits the node's resize so it fills the frame minus toolbar/padding.

**Apkg export:**

- `mindmapToNotes`, `mindmapToClozeNotes`, `mindmapToMarkmapTree` each need to read `node.image` and emit HTML that references the image filename (not the URL). The actual file gets attached via `CustomExporter.addMedia(filename, buffer)`.
- New pure helper `src/usecases/mindmaps/collectMindmapImages.ts` — walks `MindmapData.nodes`, downloads each `image.url` to a Buffer, returns `Array<{ filename, buffer }>`.
- `ExportMindmapUseCase` calls the helper first, registers each via `addMedia`, then proceeds to the existing notes pipeline. The note generators receive a URL→filename map and emit `<img src="filename.ext">` in card text.
- Cloze format: image goes in the front context (parent path), label-derived clozes stay on the back. Markmap format embeds the image inline in the rendered HTML tree.

**Tests:**

- `src/usecases/mindmaps/UploadMindmapImageUseCase.test.ts` — accepts a PNG buffer, rejects an SVG, rejects 5 MB + 1 byte, writes to the right path, returns dimensions.
- `src/routes/MindmapRouter.test.ts` — POST `/api/mindmaps/:id/images` round-trip behind auth, with a 1×1 PNG fixture.
- `src/usecases/mindmaps/mindmapToNotes.test.ts` — added case: node with `image` produces a Basic card whose back contains `<img src>` and the export collects the file.
- `web/src/pages/MindmapsPage/MindmapEditor.test.tsx` (new) — paste-image-event triggers upload + node creation. Mock the upload call via vi.mock.

## Success metric

% of mind maps that include at least one image among Auto-Sync subscribers, measured 30 days post-launch. Target: **20%**. Below 10% suggests low value; above 30% suggests we should consider a paid uplift specifically for image-heavy maps.

## Risks

1. **Storage growth.** Each image is up to 5 MB. A power user with 100 maps × 50 nodes × 1 image = ~25 GB. Cap with the existing 50-node-per-map limit; add disk-quota alerting only if usage warrants.
2. **Apkg media collisions.** Two nodes might reference the same image URL. `collectMindmapImages` should deduplicate by URL so the apkg media folder contains one file per unique image.
3. **CSP / image-host trust.** Images are served from our own domain, not user-supplied URLs. No SSRF surface. Existing CSP allows same-origin `<img>`; verify.
4. **Pasting from screenshots vs. saved files.** Both flows produce `image/png` blobs in `clipboardData.items` — should behave identically. Verify in browser.
5. **Editing a node label after pasting an image** — the textarea is for text only; users may try to "edit" an image and not understand why text doesn't work. Solution: when a node has an image, the rename action edits the label (caption); a separate "Replace image" item appears on the node toolbar.

## Alternatives considered

- **Store images as base64 data URLs inline in `MindmapData`.** Avoids the upload endpoint entirely. Rejected: the jsonb blob would balloon (5 MB image → 6.7 MB base64), and Postgres pages don't love multi-MB rows. Worse than serving them as files.
- **Reuse the existing `/api/uploads` endpoint.** Tempting, but that pipeline is designed around full document uploads (PDFs, .zip, .apkg) with a conversion result. Image-attachment is a different shape — semantically simpler, no conversion downstream, scoped to one mindmap.
- **External CDN / Cloudinary.** Overkill at v1 scale. Disk storage with the existing per-user dir is fine until we cross a usage threshold.
- **Skip "drop a file" and only support paste.** Some users prefer drag-drop from their downloads folder. Both are cheap to implement once paste works; ship both.

## Decision

Ship v1 as described. Re-evaluate the storage decision and the image-count cap at 30 days against the success metric.
