async function send(messageHash: string, method: 'POST' | 'DELETE'): Promise<void> {
  const res = await fetch(`/api/ops/errors/${messageHash}/resolve`, { method });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}

export function resolveErrorGroup(messageHash: string): Promise<void> {
  return send(messageHash, 'POST');
}

export function reopenErrorGroup(messageHash: string): Promise<void> {
  return send(messageHash, 'DELETE');
}
