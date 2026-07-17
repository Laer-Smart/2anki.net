import fs from 'fs';
import path from 'path';
import { readConfig, resolveApiBase } from '../config';
import { ApiClient, ApiError, UploadJob } from '../apiClient';
import { info, success, error, warn, ui } from '../ui';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60;

function isDone(status: string | undefined): boolean {
  return status === 'completed' || status === 'done' || status === 'success';
}

function isFailed(status: string | undefined): boolean {
  return status === 'failed' || status === 'error';
}

async function pollForJob(
  client: ApiClient,
  key: string | undefined,
  sleep: (ms: number) => Promise<void>
): Promise<UploadJob | null> {
  for (let i = 0; i < MAX_POLLS; i += 1) {
    const jobs = await client.listJobs();
    const match =
      key != null ? jobs.find((j) => j.key === key) : (jobs[0] ?? null);
    if (match != null && (isDone(match.status) || isFailed(match.status))) {
      return match;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return null;
}

export interface ConvertDeps {
  sleep?: (ms: number) => Promise<void>;
}

export async function convert(
  filePath: string | undefined,
  deps: ConvertDeps = {}
): Promise<number> {
  if (filePath == null) {
    error('Usage: 2anki convert <file>');
    return 1;
  }
  const config = readConfig();
  if (config.apiKey == null) {
    warn('Not logged in. Run `2anki login` first.');
    return 1;
  }

  let bytes: Buffer;
  try {
    bytes = fs.readFileSync(filePath);
  } catch {
    error(`Could not read ${filePath}.`);
    return 1;
  }

  const filename = path.basename(filePath);
  const client = new ApiClient(config);
  const sleep =
    deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  info(`Uploading ${ui.bold(filename)}…`);
  let job: UploadJob;
  try {
    job = await client.uploadFile(filename, bytes);
  } catch (e) {
    error(e instanceof ApiError ? e.message : 'Upload failed.');
    return 1;
  }

  info('Converting…');
  const finished = await pollForJob(client, job.key, sleep);
  if (finished == null) {
    warn(
      'Still converting after the wait window. Check back with `2anki whoami` or the web app.'
    );
    return 0;
  }
  if (isFailed(finished.status)) {
    error(
      `Conversion failed${finished.title != null ? ` for ${finished.title}` : ''}.`
    );
    return 1;
  }

  const base = resolveApiBase(config).replace(/\/$/, '');
  success(`Deck ready${finished.title != null ? `: ${finished.title}` : ''}.`);
  info(ui.dim(`Download it from ${base}/uploads`));
  return 0;
}
