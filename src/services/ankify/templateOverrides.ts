import { TemplateFile } from '../../lib/parser/Settings/types';
import { NOTION_STYLE } from '../../templates/helper';
import { AnkiConnectCreateModelParams } from './AnkiConnectClient';

export interface AnkifyTemplateOverrides {
  basicModelName: string;
  basicTemplate: TemplateFile;
}

export type AnkifyTemplateOverridesProvider = (
  owner: number,
  pageId?: string
) => Promise<AnkifyTemplateOverrides | null>;

const BASIC_FIELDS_FROM_TEMPLATE = ['Front', 'Back', 'MyMedia'];

export const buildBasicModelFromTemplate = (
  template: TemplateFile,
  modelName: string
): AnkiConnectCreateModelParams => ({
  modelName,
  inOrderFields: BASIC_FIELDS_FROM_TEMPLATE,
  css: template.styling || NOTION_STYLE,
  isCloze: false,
  cardTemplates: [
    {
      Name: 'Card 1',
      Front: template.front,
      Back: template.back,
    },
  ],
});
