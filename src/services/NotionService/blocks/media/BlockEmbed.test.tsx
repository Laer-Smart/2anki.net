import { EmbedBlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { BlockEmbed } from './BlockEmbed';
import CardOption from '../../../../lib/parser/Settings/CardOption';
import BlockHandler from '../../BlockHandler/BlockHandler';
import CustomExporter from '../../../../lib/parser/exporters/CustomExporter';
import Workspace from '../../../../lib/parser/WorkSpace';
import MockNotionAPI from '../../_mock/MockNotionAPI';
import { setupTests } from '../../../../test/configure-jest';

beforeEach(() => setupTests());

const makeHandler = () => {
  const api = new MockNotionAPI('', '');
  const exporter = new CustomExporter('', new Workspace(true, 'fs').location);
  return new BlockHandler(exporter, api, new CardOption({}));
};

const makeEmbedBlock = (url: string) =>
  ({
    id: 'block-embed-test',
    type: 'embed' as const,
    object: 'block' as const,
    parent: { type: 'page_id' as const, page_id: 'page-id' },
    created_time: '',
    last_edited_time: '',
    created_by: { object: 'user' as const, id: 'user-id' },
    last_edited_by: { object: 'user' as const, id: 'user-id' },
    has_children: false,
    archived: false,
    in_trash: false,
    embed: { url, caption: [] },
  }) as EmbedBlockObjectResponse;

describe('BlockEmbed — Loom', () => {
  it('rewrites a Loom share link to the embeddable iframe src', () => {
    const html = BlockEmbed(
      makeEmbedBlock('https://www.loom.com/share/abc123'),
      makeHandler()
    );
    expect(html).toContain('src="https://www.loom.com/embed/abc123"');
    expect(html).not.toContain('/share/');
  });
});
