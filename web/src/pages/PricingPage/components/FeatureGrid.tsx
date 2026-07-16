import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';

import ArrowLeftIcon from '../../../components/icons/ArrowLeftIcon';
import ArrowRightIcon from '../../../components/icons/ArrowRightIcon';
import ArrowUpTrayIcon from '../../../components/icons/ArrowUpTrayIcon';
import CameraIcon from '../../../components/icons/CameraIcon';
import ChatBubbleIcon from '../../../components/icons/ChatBubbleIcon';
import LayersIcon from '../../../components/icons/LayersIcon';
import PencilIcon from '../../../components/icons/PencilIcon';
import PrinterIcon from '../../../components/icons/PrinterIcon';
import RectangleGroupIcon from '../../../components/icons/RectangleGroupIcon';
import ShareIcon from '../../../components/icons/ShareIcon';
import SparklesIcon from '../../../components/icons/SparklesIcon';
import SwatchIcon from '../../../components/icons/SwatchIcon';
import styles from './FeatureGrid.module.css';

interface Feature {
  Icon: ComponentType<{ width?: number; height?: number }>;
  titleKey: string;
  descriptionKey: string;
}

const FEATURES: Feature[] = [
  {
    Icon: ArrowRightIcon,
    titleKey: 'pricing.features.notionToAnkiTitle',
    descriptionKey: 'pricing.features.notionToAnkiDesc',
  },
  {
    Icon: ArrowLeftIcon,
    titleKey: 'pricing.features.ankiToNotionTitle',
    descriptionKey: 'pricing.features.ankiToNotionDesc',
  },
  {
    Icon: ChatBubbleIcon,
    titleKey: 'pricing.features.aiChatTitle',
    descriptionKey: 'pricing.features.aiChatDesc',
  },
  {
    Icon: CameraIcon,
    titleKey: 'pricing.features.photoTitle',
    descriptionKey: 'pricing.features.photoDesc',
  },
  {
    Icon: SparklesIcon,
    titleKey: 'pricing.features.mcqTitle',
    descriptionKey: 'pricing.features.mcqDesc',
  },
  {
    Icon: RectangleGroupIcon,
    titleKey: 'pricing.features.occlusionTitle',
    descriptionKey: 'pricing.features.occlusionDesc',
  },
  {
    Icon: LayersIcon,
    titleKey: 'pricing.features.mindMapsTitle',
    descriptionKey: 'pricing.features.mindMapsDesc',
  },
  {
    Icon: PencilIcon,
    titleKey: 'pricing.features.noteTypesTitle',
    descriptionKey: 'pricing.features.noteTypesDesc',
  },
  {
    Icon: PrinterIcon,
    titleKey: 'pricing.features.printTitle',
    descriptionKey: 'pricing.features.printDesc',
  },
  {
    Icon: ShareIcon,
    titleKey: 'pricing.features.shareTitle',
    descriptionKey: 'pricing.features.shareDesc',
  },
  {
    Icon: ArrowUpTrayIcon,
    titleKey: 'pricing.features.formatsTitle',
    descriptionKey: 'pricing.features.formatsDesc',
  },
  {
    Icon: SwatchIcon,
    titleKey: 'pricing.features.themesTitle',
    descriptionKey: 'pricing.features.themesDesc',
  },
];

export function FeatureGrid() {
  const { t } = useTranslation();
  return (
    <section className={styles.section} aria-labelledby="feature-grid-heading">
      <h2 id="feature-grid-heading" className={styles.heading}>
        {t('pricing.features.heading')}
      </h2>
      <p className={styles.subheading}>{t('pricing.features.subheading')}</p>
      <ul className={styles.grid}>
        {FEATURES.map(({ Icon, titleKey, descriptionKey }) => (
          <li key={titleKey} className={styles.item}>
            <span className={styles.iconWrap} aria-hidden="true">
              <Icon width={20} height={20} />
            </span>
            <div>
              <p className={styles.itemTitle}>{t(titleKey)}</p>
              <p className={styles.itemDescription}>{t(descriptionKey)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
