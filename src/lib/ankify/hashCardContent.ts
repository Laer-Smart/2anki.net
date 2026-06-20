import crypto from 'node:crypto';

export function hashCardContent(front: string, back: string): string {
  return crypto
    .createHash('sha256')
    .update(front)
    .update('\x00')
    .update(back)
    .digest('hex');
}
