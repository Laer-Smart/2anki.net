import CustomExporter from '../../../lib/parser/exporters/CustomExporter';
import CardOption from '../../../lib/parser/Settings/CardOption';
import Workspace from '../../../lib/parser/WorkSpace';
import { setupTests } from '../../../test/configure-jest';
import MockNotionAPI from '../_mock/MockNotionAPI';
import BlockHandler from './BlockHandler';

beforeEach(() => setupTests());

function makeHandler(): BlockHandler {
  const exporter = new CustomExporter('', new Workspace(true, 'fs').location);
  return new BlockHandler(
    exporter,
    new MockNotionAPI('', ''),
    new CardOption({})
  );
}

describe('BlockHandler unsupported block type tracking', () => {
  it('preserves per-type occurrence counts when the same type recurs', () => {
    const handler = makeHandler();

    handler.recordUnsupportedBlockType('table');
    handler.recordUnsupportedBlockType('table');
    handler.recordUnsupportedBlockType('table');
    handler.recordUnsupportedBlockType('callout');

    expect(handler.unsupportedBlockTypes).toEqual([
      'table',
      'table',
      'table',
      'callout',
    ]);
  });

  it('holds distinct types once regardless of occurrence count', () => {
    const handler = makeHandler();

    for (let i = 0; i < 5000; i += 1) {
      handler.recordUnsupportedBlockType('table');
    }
    handler.recordUnsupportedBlockType('callout');

    expect(handler.unsupportedBlockTypeCounts.size).toBe(2);
    expect(handler.unsupportedBlockTypeCounts.get('table')).toBe(5000);
    expect(handler.unsupportedBlockTypeCounts.get('callout')).toBe(1);
  });

  it('starts empty', () => {
    const handler = makeHandler();

    expect(handler.unsupportedBlockTypes).toEqual([]);
    expect(handler.unsupportedBlockTypeCounts.size).toBe(0);
  });
});
