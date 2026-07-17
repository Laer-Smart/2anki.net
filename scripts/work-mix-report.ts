import { execFileSync } from 'node:child_process';
import {
  ACQUISITION_FLOOR,
  MergedPr,
  summarizeWorkMix,
  WorkMixBucket,
} from './workMix';

const DEFAULT_DAYS = 7;

function sinceMs(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

// The GitHub `merged:>=` search qualifier returns nothing on this fork, so we
// pull recent merged PRs and filter by mergedAt client-side.
function fetchMergedPrs(sinceMsValue: number): MergedPr[] {
  const raw = execFileSync(
    'gh',
    [
      'pr',
      'list',
      '--repo',
      '2anki/server',
      '--state',
      'merged',
      '--limit',
      '300',
      '--json',
      'title,labels,mergedAt',
    ],
    { encoding: 'utf8' }
  );

  const parsed = JSON.parse(raw) as Array<{
    title: string;
    labels?: Array<{ name: string }>;
    mergedAt?: string | null;
  }>;

  return parsed
    .filter(
      (pr) => pr.mergedAt != null && Date.parse(pr.mergedAt) >= sinceMsValue
    )
    .map((pr) => ({
      title: pr.title,
      labels: (pr.labels ?? []).map((l) => l.name),
    }));
}

const BUCKET_ORDER: WorkMixBucket[] = [
  'acquisition',
  'monetization',
  'core-quality',
  'new-surface',
  'process',
];

function main() {
  const days = Number(process.argv[2] ?? DEFAULT_DAYS) || DEFAULT_DAYS;
  const since = sinceMs(days);
  const prs = fetchMergedPrs(since);
  const summary = summarizeWorkMix(prs);

  const sinceLabel = new Date(since).toISOString().slice(0, 10);
  console.log(`Work-mix — ${prs.length} PR(s) merged since ${sinceLabel}`);
  for (const bucket of BUCKET_ORDER) {
    const count = summary.counts[bucket];
    const pct = (summary.shares[bucket] * 100).toFixed(0);
    console.log(`  ${bucket.padEnd(13)} ${String(count).padStart(3)}  ${pct}%`);
  }

  const floorPct = (ACQUISITION_FLOOR * 100).toFixed(0);
  if (summary.belowAllocationFloor) {
    console.log(
      `\nFLAG: acquisition ${(summary.acquisitionShare * 100).toFixed(0)}% < ${floorPct}% floor — ship an acquisition-facing change before any new product surface this week.`
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `\nOK: acquisition ${(summary.acquisitionShare * 100).toFixed(0)}% ≥ ${floorPct}% floor.`
  );
}

main();
