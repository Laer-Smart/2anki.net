import { describe, it, expect } from 'vitest';
import {
  removeAdSenseScript,
  injectAdSenseScript,
  ADSENSE_SCRIPT_ID,
} from './AdSenseScript';

function makeDoc(): Document {
  return document.implementation.createHTMLDocument();
}

function makeDocWithScript(): Document {
  const doc = makeDoc();
  const script = doc.createElement('script');
  script.id = ADSENSE_SCRIPT_ID;
  doc.head.appendChild(script);
  return doc;
}

describe('removeAdSenseScript', () => {
  it('removes the script tag when present', () => {
    const doc = makeDocWithScript();
    expect(doc.getElementById(ADSENSE_SCRIPT_ID)).not.toBeNull();
    removeAdSenseScript(doc);
    expect(doc.getElementById(ADSENSE_SCRIPT_ID)).toBeNull();
  });

  it('does not throw when the script tag is absent', () => {
    const doc = makeDoc();
    expect(() => removeAdSenseScript(doc)).not.toThrow();
  });

  it('is idempotent — calling twice does not throw', () => {
    const doc = makeDocWithScript();
    removeAdSenseScript(doc);
    expect(() => removeAdSenseScript(doc)).not.toThrow();
    expect(doc.getElementById(ADSENSE_SCRIPT_ID)).toBeNull();
  });
});

describe('injectAdSenseScript', () => {
  it('appends an async, crossorigin script tag with the AdSense src', () => {
    const doc = makeDoc();
    expect(doc.getElementById(ADSENSE_SCRIPT_ID)).toBeNull();
    injectAdSenseScript(doc);
    const script = doc.getElementById(
      ADSENSE_SCRIPT_ID
    ) as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script?.tagName).toBe('SCRIPT');
    expect(script?.async).toBe(true);
    expect(script?.crossOrigin).toBe('anonymous');
    expect(script?.src).toContain('pagead2.googlesyndication.com');
    expect(script?.src).toContain('client=ca-pub-9593032741719801');
  });

  it('does not double-inject when called twice', () => {
    const doc = makeDoc();
    injectAdSenseScript(doc);
    injectAdSenseScript(doc);
    const scripts = doc.querySelectorAll(`#${ADSENSE_SCRIPT_ID}`);
    expect(scripts).toHaveLength(1);
  });

  it('round-trips with removeAdSenseScript', () => {
    const doc = makeDoc();
    injectAdSenseScript(doc);
    expect(doc.getElementById(ADSENSE_SCRIPT_ID)).not.toBeNull();
    removeAdSenseScript(doc);
    expect(doc.getElementById(ADSENSE_SCRIPT_ID)).toBeNull();
    injectAdSenseScript(doc);
    expect(doc.getElementById(ADSENSE_SCRIPT_ID)).not.toBeNull();
  });
});
