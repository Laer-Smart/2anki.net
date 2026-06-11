import { setupTests } from '../../test/configure-jest';
import CardOption from './Settings/CardOption';
import { DeckParser } from './DeckParser';
import Workspace from './WorkSpace';
import { EmptyDeckError } from '../../usecases/jobs/EmptyDeckError';

beforeEach(() => setupTests());

describe('processPayload with an empty payload', () => {
  it('throws EmptyDeckError instead of a TypeError', async () => {
    const workspace = new Workspace(true, 'fs');
    const parser = new DeckParser({
      name: 'empty.html',
      settings: new CardOption({}),
      files: [{ name: 'empty.html', contents: '' }],
      noLimits: true,
      workspace,
    });

    await expect(parser.build(workspace)).rejects.toBeInstanceOf(
      EmptyDeckError
    );
  });
});
