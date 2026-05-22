import { describe, it, expect } from 'vitest';
import { removeAdSenseScript, ADSENSE_SCRIPT_ID } from './AdSenseScript';

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
