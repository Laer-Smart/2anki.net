import { useTranslation } from 'react-i18next';

interface BlockIconProp {
  icon?: string;
}

export const isIconFileUrl = (icon: string) => icon.includes('http');
export const isIconDataUrl = (icon: string) => icon.includes('data:image');

export function BlockIcon({ icon }: Readonly<BlockIconProp>) {
  const { t } = useTranslation('search');
  if (!icon) {
    return null;
  }

  if (isIconFileUrl(icon) || isIconDataUrl(icon)) {
    return <img width={32} height={32} src={icon} alt={t('icon.alt')} />;
  }

  return <span>{icon}</span>;
}
