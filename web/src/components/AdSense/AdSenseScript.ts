export const ADSENSE_SCRIPT_ID = 'adsense-script';

export function removeAdSenseScript(doc: Document = document): void {
  doc.getElementById(ADSENSE_SCRIPT_ID)?.remove();
}
