import fs from 'node:fs';
import path from 'node:path';
import { UploadedFile } from '../../lib/storage/types';

// Multer disk storage gives each upload a `path` but no `buffer`. The conversion
// runs later in a Piscina worker that reads the file lazily; when the pool queue
// is busy the OS or multer can reap the temp file out of UPLOAD_BASE before the
// worker reads it, and the job dies with "Uploaded file is no longer available
// on disk and has no buffer fallback" (#3414).
//
// Capture the bytes here — in the request thread, where the file is guaranteed
// to still exist — so the worker's buffer fallback is actually populated. The
// worker still prefers the disk path on the happy path; the buffer only matters
// when the temp file vanished mid-dwell.
export function ensureUploadBytes(files: UploadedFile[]): void {
  for (const file of files) {
    if (file.buffer != null || !file.path) continue;
    try {
      file.buffer = fs.readFileSync(file.path);
    } catch (error) {
      // The file is already gone or unreadable at request time (rare). Leave the
      // buffer unset; the worker surfaces its own clear error if the disk read
      // also fails by the time it runs.
      console.warn('[upload] could not snapshot upload bytes', {
        file: path.basename(file.path),
        error: String(error),
      });
    }
  }
}
