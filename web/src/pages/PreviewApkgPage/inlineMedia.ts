const MEDIA_URL_REGEX = /"(\/api\/apkg\/[^"]*\/media\/[^"]*)"/g;

export function extractApkgMediaUrls(html: string): string[] {
  const urls = new Set<string>();
  for (const match of Array.from(html.matchAll(MEDIA_URL_REGEX))) {
    urls.add(match[1]);
  }
  return Array.from(urls);
}

export async function fetchMediaAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function inlineApkgMedia(
  html: string,
  loadDataUrl: (url: string) => Promise<string | null>,
  cache: Map<string, string | null> = new Map()
): Promise<string> {
  const urls = extractApkgMediaUrls(html);
  await Promise.all(
    urls.map(async (url) => {
      if (!cache.has(url)) {
        cache.set(url, await loadDataUrl(url));
      }
    })
  );
  let out = html;
  for (const url of urls) {
    const dataUrl = cache.get(url);
    if (dataUrl) {
      out = out.split(url).join(dataUrl);
    }
  }
  return out;
}
