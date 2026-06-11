import { SettingsPayload } from '../types';

export const getLocalStorageValue = (
  key: string,
  defaultValue: string,
  theSettings: SettingsPayload
) => {
  if (theSettings && key in theSettings) {
    const fromSettings = theSettings[key];
    return fromSettings == null ? defaultValue : fromSettings;
  }
  const fromStorage = localStorage.getItem(key);
  return fromStorage == null ? defaultValue : fromStorage;
};
