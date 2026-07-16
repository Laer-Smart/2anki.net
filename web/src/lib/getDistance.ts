import { formatDistance } from 'date-fns';
import { de } from 'date-fns/locale';
import i18n from './i18n';

export const getDistance = (date: Date | string): string =>
  formatDistance(new Date(date), new Date(), {
    addSuffix: true,
    locale: i18n.language?.startsWith('de') ? de : undefined,
  });
