import { resolveEmbedUrl, resolveVideoUrl } from './embedUrl';

describe('resolveVideoUrl', () => {
  it('rewrites a YouTube URL to the embed iframe src', () => {
    const result = resolveVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result.kind).toBe('iframe');
    if (result.kind === 'iframe') {
      expect(result.src).toContain('youtube.com/embed/dQw4w9WgXcQ');
    }
  });

  it('rewrites a Vimeo URL to player.vimeo.com', () => {
    const result = resolveVideoUrl('https://vimeo.com/123456789');
    expect(result).toEqual({
      kind: 'iframe',
      src: 'https://player.vimeo.com/video/123456789',
    });
  });

  it('falls back to raw-url for an unrecognized host', () => {
    const result = resolveVideoUrl('https://example.com/clip.mp4');
    expect(result).toEqual({
      kind: 'raw-url',
      url: 'https://example.com/clip.mp4',
    });
  });
});

describe('resolveEmbedUrl', () => {
  it('wraps a SoundCloud track in the SoundCloud player iframe', () => {
    const url = 'https://soundcloud.com/artist/track';
    const result = resolveEmbedUrl(url);
    expect(result.kind).toBe('iframe');
    if (result.kind === 'iframe') {
      expect(result.src).toBe(
        `https://w.soundcloud.com/player/?url=${url}`
      );
    }
  });

  it('returns a twitter-link directive for Twitter URLs', () => {
    const result = resolveEmbedUrl('https://twitter.com/x/status/1');
    expect(result).toEqual({
      kind: 'twitter-link',
      url: 'https://twitter.com/x/status/1',
    });
  });

  it('rewrites YouTube and Vimeo to embed iframes', () => {
    const yt = resolveEmbedUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(yt.kind).toBe('iframe');

    const vimeo = resolveEmbedUrl('https://vimeo.com/42');
    expect(vimeo).toEqual({
      kind: 'iframe',
      src: 'https://player.vimeo.com/video/42',
    });
  });

  it('rewrites a Loom share link to its embeddable form', () => {
    const result = resolveEmbedUrl('https://www.loom.com/share/abc123');
    expect(result).toEqual({
      kind: 'iframe',
      src: 'https://www.loom.com/embed/abc123',
    });
  });

  it('passes other URLs through as iframe src', () => {
    const result = resolveEmbedUrl('https://codepen.io/user/pen/abc');
    expect(result).toEqual({
      kind: 'iframe',
      src: 'https://codepen.io/user/pen/abc',
    });
  });
});
