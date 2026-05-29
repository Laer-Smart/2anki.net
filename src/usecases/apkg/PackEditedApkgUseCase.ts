import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import archiver from 'archiver';
import Database from 'better-sqlite3';
import { CardEdit } from '../../services/ApkgPreviewService/applyEditsToCards';
import { extractApkg } from '../../services/ApkgPreviewService/extractApkg';

export interface PackEditedApkgInput {
  sourceBytes: Buffer;
  filename: string;
  edits: CardEdit[];
}

export interface PackEditedApkgOutput {
  buffer: Buffer;
  filename: string;
}

function writeTempFile(buffer: Buffer, suffix: string): string {
  const p = path.join(os.tmpdir(), `apkg-edit-${crypto.randomUUID()}${suffix}`);
  fs.writeFileSync(p, buffer);
  return p;
}

function buildEditedSqlite(collectionBuffer: Buffer, edits: CardEdit[]): Buffer {
  const deletedIndices = new Set<number>();
  const suspendedIndices = new Set<number>();
  const textEdits = new Map<number, { front?: string; back?: string }>();

  for (const edit of edits) {
    if (edit.deleted) deletedIndices.add(edit.cardIndex);
    if (edit.suspended) suspendedIndices.add(edit.cardIndex);
    if (edit.front != null || edit.back != null) {
      textEdits.set(edit.cardIndex, { front: edit.front, back: edit.back });
    }
  }

  const tempPath = writeTempFile(collectionBuffer, '.sqlite');
  try {
    const db = new Database(tempPath);
    try {
      const allCards = db
        .prepare('SELECT id, nid, ord FROM cards ORDER BY id')
        .all() as Array<{ id: number; nid: number; ord: number }>;

      const cardIdsToDelete: number[] = [];

      for (let i = 0; i < allCards.length; i++) {
        const card = allCards[i];
        if (deletedIndices.has(i)) {
          cardIdsToDelete.push(card.id);
        }
        if (suspendedIndices.has(i)) {
          db.prepare('UPDATE cards SET queue = -1 WHERE id = ?').run(card.id);
        }
        const te = textEdits.get(i);
        if (te) {
          const note = db
            .prepare('SELECT flds FROM notes WHERE id = ?')
            .get(card.nid) as { flds: string } | undefined;
          if (note) {
            const fields = note.flds.split('\x1f');
            if (te.front != null) fields[0] = te.front;
            if (te.back != null && fields.length > 1) fields[1] = te.back;
            db.prepare('UPDATE notes SET flds = ? WHERE id = ?').run(
              fields.join('\x1f'),
              card.nid
            );
          }
        }
      }

      for (const cardId of cardIdsToDelete) {
        db.prepare('DELETE FROM cards WHERE id = ?').run(cardId);
      }
    } finally {
      db.close();
    }
    return fs.readFileSync(tempPath);
  } finally {
    fs.unlinkSync(tempPath);
  }
}

async function packApkg(
  collectionBuffer: Buffer,
  collectionName: string,
  mediaManifestRaw: Buffer | null,
  mediaEntries: Map<string, Buffer>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { store: true });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    archive.on('warning', (err: Error) => {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') reject(err);
    });

    archive.append(collectionBuffer, { name: collectionName });

    if (mediaManifestRaw) {
      archive.append(mediaManifestRaw, { name: 'media' });
    } else {
      archive.append(Buffer.from('{}'), { name: 'media' });
    }

    for (const [name, data] of mediaEntries.entries()) {
      archive.append(data, { name });
    }

    archive.finalize();
  });
}

export default class PackEditedApkgUseCase {
  async execute(input: PackEditedApkgInput): Promise<PackEditedApkgOutput> {
    const { sourceBytes, filename, edits } = input;
    const archive = await extractApkg(sourceBytes);

    const editedCollectionBuffer = buildEditedSqlite(
      archive.collectionBuffer,
      edits
    );

    const apkgBuffer = await packApkg(
      editedCollectionBuffer,
      archive.collectionName,
      archive.mediaManifestRaw,
      archive.mediaEntries
    );

    const baseName = filename.replace(/\.apkg$/i, '');
    return { buffer: apkgBuffer, filename: `${baseName}-edited.apkg` };
  }
}
