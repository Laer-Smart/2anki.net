import { decompress as zstdDecompress } from 'fzstd';
import yauzl from 'yauzl';

import { readRepeatedSubmessages, readString } from './protobuf';

export interface ApkgArchive {
  collectionBuffer: Buffer;
  collectionName: string;
  mediaManifestRaw: Buffer | null;
  mediaEntries: Map<string, Buffer>;
}

const COLLECTION_CANDIDATES = [
  'collection.anki21b',
  'collection.anki21',
  'collection.anki2',
];

function readEntry(
  zipfile: yauzl.ZipFile,
  entry: yauzl.Entry
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err, stream) => {
      if (err || !stream) return reject(err ?? new Error('no stream'));
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  });
}

export async function extractApkg(bytes: Buffer): Promise<ApkgArchive> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(bytes, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err ?? new Error('open failed'));

      const collections: Map<string, Buffer> = new Map();
      const mediaEntries: Map<string, Buffer> = new Map();
      let mediaManifestRaw: Buffer | null = null;

      zipfile.on('entry', (entry: yauzl.Entry) => {
        if (/\/$/.test(entry.fileName)) {
          zipfile.readEntry();
          return;
        }
        readEntry(zipfile, entry)
          .then((buf) => {
            if (COLLECTION_CANDIDATES.includes(entry.fileName)) {
              collections.set(entry.fileName, buf);
            } else if (entry.fileName === 'media') {
              mediaManifestRaw = buf;
            } else if (/^\d+$/.test(entry.fileName)) {
              mediaEntries.set(entry.fileName, buf);
            }
            zipfile.readEntry();
          })
          .catch(reject);
      });

      zipfile.on('end', () => {
        const name = COLLECTION_CANDIDATES.find((candidate) =>
          collections.has(candidate)
        );
        if (!name) {
          reject(new Error('No Anki collection file found in archive'));
          return;
        }
        let collectionBuffer = collections.get(name) as Buffer;
        if (name === 'collection.anki21b') {
          collectionBuffer = Buffer.from(
            zstdDecompress(new Uint8Array(collectionBuffer))
          );
        }
        resolve({
          collectionBuffer,
          collectionName: name,
          mediaManifestRaw,
          mediaEntries,
        });
      });

      zipfile.on('error', reject);
      zipfile.readEntry();
    });
  });
}

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

function isZstdCompressed(buf: Buffer): boolean {
  return buf.length >= 4 && buf.subarray(0, 4).equals(ZSTD_MAGIC);
}

function parseProtobufMediaManifest(buf: Buffer): Map<string, string> {
  const map = new Map<string, string>();
  const entries = readRepeatedSubmessages(buf, 1);
  for (let i = 0; i < entries.length; i++) {
    const name = readString(entries[i], 1);
    if (name) {
      map.set(name, String(i));
    }
  }
  return map;
}

export function parseMediaManifest(raw: Buffer | null): Map<string, string> {
  if (!raw || raw.length === 0) return new Map();
  let buf = raw;
  if (isZstdCompressed(buf)) {
    buf = Buffer.from(zstdDecompress(new Uint8Array(buf)));
  }
  try {
    const json = JSON.parse(buf.toString('utf8')) as Record<string, string>;
    const map = new Map<string, string>();
    for (const [archiveName, originalName] of Object.entries(json)) {
      map.set(originalName, archiveName);
    }
    return map;
  } catch {
    return parseProtobufMediaManifest(buf);
  }
}
