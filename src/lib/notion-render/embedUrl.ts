import getLoomEmbedUrl from '../parser/helpers/getLoomEmbedUrl';
import getYouTubeEmbedLink from '../parser/helpers/getYouTubeEmbedLink';
import getYouTubeID from '../parser/helpers/getYouTubeID';
import {
  isLoomURL,
  isSoundCloudURL,
  isTwitterURL,
  isVimeoURL,
} from '../storage/checks';

export type ResolvedEmbed =
  | { kind: 'iframe'; src: string }
  | { kind: 'twitter-link'; url: string }
  | { kind: 'raw-url'; url: string };

const vimeoIdFromUrl = (url: string): string | null => {
  const tail = url.split('/').pop();
  if (tail == null || tail === '') return null;
  return tail.split('?')[0];
};

export const resolveVideoUrl = (url: string): ResolvedEmbed => {
  const yt = getYouTubeID(url);
  if (yt != null) {
    return { kind: 'iframe', src: getYouTubeEmbedLink(yt) };
  }
  if (isVimeoURL(url) != null) {
    const id = vimeoIdFromUrl(url);
    if (id != null && id !== '') {
      return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` };
    }
  }
  return { kind: 'raw-url', url };
};

export const resolveEmbedUrl = (url: string): ResolvedEmbed => {
  if (isSoundCloudURL(url) != null) {
    return {
      kind: 'iframe',
      src: `https://w.soundcloud.com/player/?url=${url}`,
    };
  }
  if (isTwitterURL(url) != null) {
    return { kind: 'twitter-link', url };
  }
  const yt = getYouTubeID(url);
  if (yt != null) {
    return { kind: 'iframe', src: getYouTubeEmbedLink(yt) };
  }
  if (isVimeoURL(url) != null) {
    const id = vimeoIdFromUrl(url);
    if (id != null && id !== '') {
      return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` };
    }
  }
  if (isLoomURL(url) != null) {
    return { kind: 'iframe', src: getLoomEmbedUrl(url) };
  }
  return { kind: 'iframe', src: url };
};
