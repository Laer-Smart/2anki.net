import { run } from './index';

run(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`
    );
    process.exitCode = 1;
  });
