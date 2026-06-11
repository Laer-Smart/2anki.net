import React from 'react';
import TagRegistry from '../../../lib/parser/TagRegistry';
import { RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints';
import notionColorToHex, { isNotionColorBackground } from '../NotionColors';

interface Annotations {
  underline: boolean;
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  code: boolean;
  color?: string;
}

interface HandleBlockAnnotationsOptions {
  noUnderline?: boolean;
  tagRegistry?: TagRegistry;
}

const HandleBlockAnnotations = (
  annotations: Annotations,
  text: RichTextItemResponse,
  options: HandleBlockAnnotationsOptions = {}
) => {
  if (!text) {
    return null;
  }
  const content = text.plain_text;
  const color = annotations.color;
  let styledContent: React.ReactNode = content;
  if (annotations.code) {
    styledContent = <code>{styledContent}</code>;
  }
  if (annotations.strikethrough) {
    options.tagRegistry?.addStrikethrough(content);
    styledContent = <del>{styledContent}</del>;
  }
  if (annotations.italic) {
    styledContent = <em>{styledContent}</em>;
  }
  if (annotations.bold) {
    styledContent = <strong>{styledContent}</strong>;
  }
  if (annotations.underline && !options.noUnderline) {
    styledContent = (
      <span style={{ borderBottom: '0.05em solid' }}>{styledContent}</span>
    );
  }
  if (color && isNotionColorBackground(color)) {
    styledContent = (
      <span style={{ backgroundColor: notionColorToHex(color) }}>
        {styledContent}
      </span>
    );
  }
  return <>{styledContent}</>;
};

export default HandleBlockAnnotations;
