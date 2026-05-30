export const TRANSFORM_NOTE_CAP_PAID = 250;

export function getTransformNoteCap(isPaying: boolean): number {
  return isPaying ? TRANSFORM_NOTE_CAP_PAID : 0;
}
