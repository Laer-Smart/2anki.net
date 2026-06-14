import { REVIEW_MEDIA_CSS } from './reviewMediaCss';

describe('REVIEW_MEDIA_CSS', () => {
  it('contains the image containment rules so a card image cannot blow out the frame', () => {
    expect(REVIEW_MEDIA_CSS).toContain('max-width:100%');
    expect(REVIEW_MEDIA_CSS).toContain('max-height:60vh');
    expect(REVIEW_MEDIA_CSS).toContain('object-fit:contain');
  });

  it('constrains audio width and prevents horizontal card scroll', () => {
    expect(REVIEW_MEDIA_CSS).toContain('audio{');
    expect(REVIEW_MEDIA_CSS).toContain('max-width:320px');
    expect(REVIEW_MEDIA_CSS).toContain('body.card{overflow-x:hidden}');
  });

  it('styles the missing-media chip used in place of a broken reference', () => {
    expect(REVIEW_MEDIA_CSS).toContain('.n2a-review-missing');
  });
});
