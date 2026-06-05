import { isFullBlock } from '@notionhq/client';
import {
  BlockObjectResponse,
  Heading1BlockObjectResponse,
  Heading2BlockObjectResponse,
  Heading3BlockObjectResponse,
  Heading4BlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

export const getHeadingColor = (block: BlockObjectResponse) => {
  if (!isFullBlock(block)) {
    return 'default';
  }
  switch (block.type) {
    case 'heading_1':
      return (block as Heading1BlockObjectResponse).heading_1.color;
    case 'heading_2':
      return (block as Heading2BlockObjectResponse).heading_2.color;
    case 'heading_3':
      return (block as Heading3BlockObjectResponse).heading_3.color;
    case 'heading_4':
      return (block as Heading4BlockObjectResponse).heading_4.color;
    default:
      return 'default';
  }
};
