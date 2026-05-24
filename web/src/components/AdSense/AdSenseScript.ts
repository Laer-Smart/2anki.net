export const ADSENSE_SCRIPT_ID = 'adsense-script';
const ADSENSE_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9593032741719801';

export function removeAdSenseScript(doc: Document = document): void {
  doc.getElementById(ADSENSE_SCRIPT_ID)?.remove();
}

export function injectAdSenseScript(doc: Document = document): void {
  if (doc.getElementById(ADSENSE_SCRIPT_ID)) return;
  const script = doc.createElement('script');
  script.id = ADSENSE_SCRIPT_ID;
  script.async = true;
  script.src = ADSENSE_SRC;
  script.crossOrigin = 'anonymous';
  doc.head.appendChild(script);
}
