const useColor = process.stdout.isTTY && process.env.NO_COLOR == null;

function paint(code: string, text: string): string {
  return useColor ? `[${code}m${text}[0m` : text;
}

export const ui = {
  bold: (t: string) => paint('1', t),
  dim: (t: string) => paint('2', t),
  green: (t: string) => paint('32', t),
  red: (t: string) => paint('31', t),
  yellow: (t: string) => paint('33', t),
  cyan: (t: string) => paint('36', t),
};

export function info(message: string): void {
  process.stdout.write(`${message}\n`);
}

export function success(message: string): void {
  process.stdout.write(`${ui.green('✓')} ${message}\n`);
}

export function warn(message: string): void {
  process.stdout.write(`${ui.yellow('!')} ${message}\n`);
}

export function error(message: string): void {
  process.stderr.write(`${ui.red('✗')} ${message}\n`);
}
