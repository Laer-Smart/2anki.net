import {
  BlockObjectResponse,
  EquationBlockObjectResponse,
  ListBlockChildrenResponse,
} from '@notionhq/client/build/src/api-endpoints';
import BlockHandler from '../BlockHandler/BlockHandler';
import { BlockCallout } from '../blocks/BlockCallout';
import { BlockChildPage } from '../blocks/BlockChildPage';
import BlockCode from '../blocks/BlockCode';
import { BlockDivider } from '../blocks/BlockDivider';
import BlockEquation from '../blocks/BlockEquation';
import { BlockHeading } from '../blocks/BlockHeadings';
import BlockParagraph from '../blocks/BlockParagraph';
import { BlockQuote } from '../blocks/BlockQuote';
import LinkToPage from '../blocks/LinkToPage/LinkToPage';
import { BlockBulletList } from '../blocks/lists/BlockBulletList';
import BlockColumnList from '../blocks/lists/BlockColumnList';
import { BlockNumberedList } from '../blocks/lists/BlockNumberedList';
import { BlockTable } from '../blocks/lists/BlockTable';
import { BlockTodoList } from '../blocks/lists/BlockTodoList';
import { BlockToggleList } from '../blocks/lists/BlockToggleList';
import BlockBookmark from '../blocks/media/BlockBookmark';
import { BlockEmbed } from '../blocks/media/BlockEmbed';
import { BlockVideo } from '../blocks/media/BlockVideo';

export const blockToStaticMarkup = async (
  handler: BlockHandler,
  c: BlockObjectResponse,
  response?: ListBlockChildrenResponse
) => {
  let back = '';
  switch (c.type) {
    case 'image':
      const image = await handler.embedImage(c);
      back += image;
      break;
    case 'audio':
      const audio = await handler.embedAudioFile(c);
      back += audio;
      break;
    case 'file':
      const file = await handler.embedFile(c);
      back += file;
      break;
    case 'paragraph':
      back += await BlockParagraph(c, handler);
      break;
    case 'code':
      back += BlockCode(c, handler);
      break;
    case 'heading_1':
      back += await BlockHeading('heading_1', c, handler);
      break;
    case 'heading_2':
      back += await BlockHeading('heading_2', c, handler);
      break;
    case 'heading_3':
      back += await BlockHeading('heading_3', c, handler);
      break;
    case 'quote':
      back += BlockQuote(c, handler);
      break;
    case 'divider':
      back += BlockDivider();
      break;
    case 'child_page':
      back += await BlockChildPage(c, handler);
      break;
    case 'to_do':
      back += await BlockTodoList(c, response, handler);
      break;
    case 'callout':
      back += BlockCallout(c, handler);
      break;
    case 'bulleted_list_item':
      back += await BlockBulletList(c, response, handler);
      break;
    case 'numbered_list_item':
      back += await BlockNumberedList(c, response, handler);
      break;
    case 'toggle':
      back += await BlockToggleList(c, handler);
      break;
    case 'bookmark':
      back += await BlockBookmark(c, handler);
      break;
    case 'video':
      back += BlockVideo(c, handler);
      break;
    case 'embed':
      back += BlockEmbed(c, handler);
      break;
    case 'column_list':
      back += await BlockColumnList(c, handler);
      break;
    case 'equation':
      back += BlockEquation(c as EquationBlockObjectResponse);
      break;
    case 'link_to_page':
      back += await LinkToPage(c, handler);
      break;
    case 'table':
      back += await BlockTable(c, handler);
      break;
    case 'table_row':
      break;
    default:
      back += `unsupported: ${c.type}`;
      back += BlockDivider();
      back += `
          <pre>
          ${JSON.stringify(c, null, 4)}
          </pre>`;
      console.debug(`unsupported ${c.type}`);
  }
  return back;
};
