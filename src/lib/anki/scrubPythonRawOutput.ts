import { PythonExitError } from './buildPythonExitError';

const RAW_OUTPUT_MAX_LENGTH = 500;

const QUOTED_FILENAME_PATTERN =
  /(['"])[^'"\n]{0,200}\.(?:html?|md|markdown|csv|txt|zip|apkg|colpkg|pdf|png|jpe?g|gif|webp|xlsx)\1/gi;
const ABSOLUTE_PATH_PATTERN = /(?:\/[\w.@%+~-]+){2,}/g;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const TOKEN_PATTERN = /\b[A-Za-z0-9_-]{32,}\b/g;

function redactPath(path: string): string {
  const basename = path.slice(path.lastIndexOf('/') + 1);
  return basename.endsWith('.py') ? basename : '[path]';
}

export function scrubPythonRawOutput(rawOutput: string): string {
  return rawOutput
    .replace(QUOTED_FILENAME_PATTERN, '[file]')
    .replace(ABSOLUTE_PATH_PATTERN, redactPath)
    .replace(EMAIL_PATTERN, '[email]')
    .replace(TOKEN_PATTERN, '[token]')
    .slice(0, RAW_OUTPUT_MAX_LENGTH);
}

export function buildUnknownPythonErrorContext(
  err: Error
): Record<string, unknown> | null {
  if (
    err instanceof PythonExitError &&
    err.kind === 'unknown' &&
    err.rawOutput !== ''
  ) {
    return {
      python_crash_kind: err.kind,
      python_exit_code: err.code,
      python_raw_output: scrubPythonRawOutput(err.rawOutput),
    };
  }
  return null;
}
