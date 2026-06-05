import { runParserCanary, CANARY_FIXTURES } from './runParserCanary';

async function main() {
  console.log('Running parser against all canary fixtures...\n');

  const result = await runParserCanary(
    CANARY_FIXTURES.map((f) => ({
      name: f.name,
      snapshot: { cardCount: -1, imageCount: -1, clozeCount: -1 },
    }))
  );

  if (result.status === 'pass') {
    console.log('No fixtures to update — all match current snapshots.');
    return;
  }

  console.log(
    'Updated snapshot values (copy into CANARY_FIXTURES in runParserCanary.ts):\n'
  );

  for (const failure of result.failures) {
    console.log(`  // ${failure.fixtureName}`);
    console.log(
      `  snapshot: { cardCount: ${failure.actual.cardCount}, imageCount: ${failure.actual.imageCount}, clozeCount: ${failure.actual.clozeCount} },`
    );
    console.log();
  }
}

main().catch((error) => {
  console.error('updateSnapshots failed:', error);
  process.exit(1);
});
