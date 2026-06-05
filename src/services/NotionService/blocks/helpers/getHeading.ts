import {
  BlockObjectResponse,
  Heading1BlockObjectResponse,
  Heading2BlockObjectResponse,
  Heading3BlockObjectResponse,
  Heading4BlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

export const getHeading = (block?: BlockObjectResponse) => {
  switch (block?.type) {
    case 'heading_1':
      return (block as Heading1BlockObjectResponse).heading_1;
    case 'heading_2':
      return (block as Heading2BlockObjectResponse).heading_2;
    case 'heading_3':
      return (block as Heading3BlockObjectResponse).heading_3;
    case 'heading_4':
      return (block as Heading4BlockObjectResponse).heading_4;
    default:
      return undefined;
  }
};
