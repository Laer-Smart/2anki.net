import { useCallback, useRef } from 'react';

export interface DropboxFile {
  id: string;
  name: string;
  bytes: number;
  icon: string;
  isDir: boolean;
  link: string;
  linkType: 'preview' | 'direct';
}

interface DropboxChooseOptions {
  success: (files: DropboxFile[]) => void;
  cancel?: () => void;
  linkType?: 'preview' | 'direct';
  multiselect?: boolean;
  extensions?: string[];
}

interface DropboxGlobal {
  choose: (options: DropboxChooseOptions) => void;
}

declare global {
  interface Window {
    Dropbox?: DropboxGlobal;
  }
}

const SDK_SRC = 'https://www.dropbox.com/static/api/2/dropins.js';
const SDK_SCRIPT_ID = 'dropboxjs';

const SDK_UNAVAILABLE =
  "Couldn't load Dropbox. Check your connection or disable script blockers and try again.";

type ChooserResult =
  | { kind: 'picked'; files: DropboxFile[] }
  | { kind: 'cancelled' };

function appKey(): string | null {
  const key = process.env.REACT_APP_DROPBOX_APP_KEY;
  return key && key.length > 0 ? key : null;
}

function loadSdk(key: string): Promise<DropboxGlobal> {
  if (window.Dropbox) {
    return Promise.resolve(window.Dropbox);
  }
  const existing = document.getElementById(
    SDK_SCRIPT_ID
  ) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => {
        if (window.Dropbox) resolve(window.Dropbox);
        else reject(new Error(SDK_UNAVAILABLE));
      });
      existing.addEventListener('error', () =>
        reject(new Error(SDK_UNAVAILABLE))
      );
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SDK_SCRIPT_ID;
    script.src = SDK_SRC;
    script.setAttribute('data-app-key', key);
    script.addEventListener('load', () => {
      if (window.Dropbox) resolve(window.Dropbox);
      else reject(new Error(SDK_UNAVAILABLE));
    });
    script.addEventListener('error', () => reject(new Error(SDK_UNAVAILABLE)));
    document.head.appendChild(script);
  });
}

export function useDropboxChooser(extensions: string[]) {
  const loadingRef = useRef(false);

  const openChooser = useCallback((): Promise<ChooserResult> => {
    const key = appKey();
    if (!key) {
      return Promise.reject(new Error(SDK_UNAVAILABLE));
    }
    if (loadingRef.current) {
      return Promise.reject(new Error('Dropbox chooser is already open.'));
    }
    loadingRef.current = true;
    return loadSdk(key)
      .then(
        (sdk) =>
          new Promise<ChooserResult>((resolve) => {
            sdk.choose({
              linkType: 'direct',
              multiselect: false,
              extensions,
              success: (files) => resolve({ kind: 'picked', files }),
              cancel: () => resolve({ kind: 'cancelled' }),
            });
          })
      )
      .finally(() => {
        loadingRef.current = false;
      });
  }, [extensions]);

  return { openChooser, isConfigured: appKey() != null };
}
