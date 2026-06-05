const inFlight = new Set<number>();

export function tryClaimRefresh(owner: number): boolean {
  if (inFlight.has(owner)) return false;
  inFlight.add(owner);
  return true;
}

export function releaseRefresh(owner: number): void {
  inFlight.delete(owner);
}

export function __resetTopLevelPagesRefreshGateForTests(): void {
  inFlight.clear();
}
