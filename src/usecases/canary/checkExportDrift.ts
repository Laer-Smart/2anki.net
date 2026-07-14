import { runExportDriftCanary } from './runExportDriftCanary';

async function main() {
  const result = await runExportDriftCanary();

  if (result.status === 'pass') {
    console.log(
      'Export-format drift canary: all reference exports match their committed baselines.'
    );
    return;
  }

  console.error('Export-format drift canary: divergence detected.\n');
  for (const failure of result.failures) {
    console.error(`Drift class: ${failure.driftClass}`);
    console.error(`  Fixture: ${failure.htmlPath}`);
    console.error(`  Diverged fields: ${failure.divergedFields.join(', ')}`);
    console.error(`  Expected: ${JSON.stringify(failure.expected)}`);
    console.error(`  Actual:   ${JSON.stringify(failure.actual)}\n`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error('checkExportDrift failed:', error);
  process.exit(1);
});
