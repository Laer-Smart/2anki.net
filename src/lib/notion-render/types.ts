export interface NotionRichTextItem {
  plain_text?: string;
  href?: string | null;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
  equation?: { expression?: string };
  type?: string;
}

interface RichTextHolder {
  rich_text?: NotionRichTextItem[];
  color?: string;
}

interface MediaContent {
  type: 'external' | 'file';
  external?: { url: string };
  file?: { url: string; expiry_time?: string };
  caption?: NotionRichTextItem[];
  name?: string;
}

export interface NotionRenderableBlock {
  id?: string;
  type: string;
  has_children?: boolean;
  paragraph?: RichTextHolder;
  heading_1?: RichTextHolder;
  heading_2?: RichTextHolder;
  heading_3?: RichTextHolder;
  bulleted_list_item?: RichTextHolder;
  numbered_list_item?: RichTextHolder;
  to_do?: RichTextHolder & { checked?: boolean };
  toggle?: RichTextHolder;
  quote?: RichTextHolder;
  callout?: RichTextHolder & {
    icon?: { type: 'emoji' | 'external' | 'file'; emoji?: string };
  };
  code?: RichTextHolder & { language?: string };
  equation?: { expression?: string };
  image?: MediaContent;
  video?: MediaContent;
  audio?: MediaContent;
  file?: MediaContent;
  pdf?: MediaContent;
  embed?: { url?: string; caption?: NotionRichTextItem[] };
  bookmark?: { url?: string; caption?: NotionRichTextItem[] };
  divider?: Record<string, never>;
  child_page?: { title?: string };
  child_database?: { title?: string };
}

export type WalkedMediaKind = 'image' | 'video' | 'audio' | 'file';

export interface WalkedNotionMediaRef {
  block_id: string;
  kind: WalkedMediaKind;
  source: 'external' | 'file';
  url: string;
  filename?: string;
}

export type NotionBlockChildrenFetcher = (
  blockId: string
) => Promise<NotionRenderableBlock[]>;

export interface RenderedBlocks {
  html: string;
  media: WalkedNotionMediaRef[];
  unsupportedTypes: string[];
}

export interface RenderOptions {
  maxDepth?: number;
}
