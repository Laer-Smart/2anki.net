import { useEffect, useState } from 'react';
import { type Theme, THEME_CHANGE_EVENT, getStoredTheme } from '../theme';

export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    function handleChange(e: Event) {
      setTheme((e as CustomEvent<Theme>).detail);
    }
    globalThis.addEventListener(THEME_CHANGE_EVENT, handleChange);
    return () =>
      globalThis.removeEventListener(THEME_CHANGE_EVENT, handleChange);
  }, []);

  return theme;
}
