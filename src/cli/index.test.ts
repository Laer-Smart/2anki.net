import { run } from './index';

describe('cli run dispatch', () => {
  const write = jest
    .spyOn(process.stdout, 'write')
    .mockImplementation(() => true);

  afterEach(() => write.mockClear());
  afterAll(() => write.mockRestore());

  it('prints help and exits 0 for help', async () => {
    expect(await run(['help'])).toBe(0);
    expect(write).toHaveBeenCalled();
  });

  it('exits 1 for an unknown command', async () => {
    expect(await run(['definitely-not-a-command'])).toBe(1);
  });
});
