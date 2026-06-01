export function stripUrlParam(param: string): void {
  const replaceState = globalThis.history?.replaceState;
  if (typeof replaceState !== 'function') {
    return;
  }

  const params = new URLSearchParams(globalThis.location.search);
  if (!params.has(param)) {
    return;
  }

  params.delete(param);
  const query = params.toString();
  const cleaned = `${globalThis.location.pathname}${query ? `?${query}` : ''}${
    globalThis.location.hash ?? ''
  }`;
  replaceState.call(globalThis.history, globalThis.history.state, '', cleaned);
}
