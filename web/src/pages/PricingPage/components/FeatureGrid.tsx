import type { ComponentType } from 'react';

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
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    Icon: ArrowRightIcon,
    title: 'Notion → Anki',
    description: 'Convert Notion pages and exports into decks',
  },
  {
    Icon: ArrowLeftIcon,
    title: 'Anki → Notion',
    description: 'Import .apkg decks back into Notion',
  },
  {
    Icon: ChatBubbleIcon,
    title: 'AI chat',
    description: 'Draft and refine cards with Claude',
  },
  {
    Icon: CameraIcon,
    title: 'Photo to deck',
    description: 'Snap a page or slide — AI turns it into cards',
  },
  {
    Icon: SparklesIcon,
    title: 'Multiple choice',
    description: 'Quiz-style cards with up to 7 options',
  },
  {
    Icon: RectangleGroupIcon,
    title: 'Image occlusion',
    description: 'Hide-and-reveal cards from any diagram',
  },
  {
    Icon: LayersIcon,
    title: 'Mind maps',
    description: 'Turn a page into a visual mind map',
  },
  {
    Icon: PencilIcon,
    title: 'Custom note types',
    description: 'Basic, Cloze, and your own card templates',
  },
  {
    Icon: PrinterIcon,
    title: 'Print to PDF',
    description: 'Study offline — print any deck',
  },
  {
    Icon: ShareIcon,
    title: 'Deck sharing',
    description: 'Share a deck with a link',
  },
  {
    Icon: ArrowUpTrayIcon,
    title: 'Every file format',
    description: 'PDF, Word, PowerPoint, EPUB, CSV, Markdown, and more',
  },
  {
    Icon: SwatchIcon,
    title: 'Themes',
    description: 'Light, dark, gold, and purple',
  },
];

export function FeatureGrid() {
  return (
    <section className={styles.section} aria-labelledby="feature-grid-heading">
      <h2 id="feature-grid-heading" className={styles.heading}>
        Everything 2anki does
      </h2>
      <p className={styles.subheading}>
        Every plan includes all of it, free included. Paid plans lift the
        limits.
      </p>
      <ul className={styles.grid}>
        {FEATURES.map(({ Icon, title, description }) => (
          <li key={title} className={styles.item}>
            <span className={styles.iconWrap} aria-hidden="true">
              <Icon width={20} height={20} />
            </span>
            <div>
              <p className={styles.itemTitle}>{title}</p>
              <p className={styles.itemDescription}>{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
