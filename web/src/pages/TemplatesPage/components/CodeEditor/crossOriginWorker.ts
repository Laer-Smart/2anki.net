export function crossOriginWorker(url: string): Worker {
  try {
    const blob = new Blob([`importScripts(${JSON.stringify(url)});`], {
      type: 'application/javascript',
    });
    return new Worker(URL.createObjectURL(blob));
  } catch {
    return new Worker(url);
  }
}
