import { logClaudeUsage } from './logClaudeUsage';

describe('logClaudeUsage', () => {
  let infoSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  it('emits a [claude-usage] line with label, input, output, cache_create, cache_read', () => {
    logClaudeUsage('ClaudeService', {
      input_tokens: 100,
      output_tokens: 200,
      cache_creation_input_tokens: 50,
      cache_read_input_tokens: 25,
    });

    expect(infoSpy).toHaveBeenCalledWith(
      '[claude-usage] label=ClaudeService input=100 output=200 cache_create=50 cache_read=25'
    );
  });

  it('defaults missing cache_creation_input_tokens to 0', () => {
    logClaudeUsage('AINoteTypeUseCase', {
      input_tokens: 10,
      output_tokens: 20,
      cache_read_input_tokens: 5,
    });

    expect(infoSpy).toHaveBeenCalledWith(
      '[claude-usage] label=AINoteTypeUseCase input=10 output=20 cache_create=0 cache_read=5'
    );
  });

  it('defaults missing cache_read_input_tokens to 0', () => {
    logClaudeUsage('OstController', {
      input_tokens: 30,
      output_tokens: 40,
      cache_creation_input_tokens: 7,
    });

    expect(infoSpy).toHaveBeenCalledWith(
      '[claude-usage] label=OstController input=30 output=40 cache_create=7 cache_read=0'
    );
  });

  it('treats null cache fields as 0', () => {
    logClaudeUsage('ChatUseCase', {
      input_tokens: 1,
      output_tokens: 2,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
    });

    expect(infoSpy).toHaveBeenCalledWith(
      '[claude-usage] label=ChatUseCase input=1 output=2 cache_create=0 cache_read=0'
    );
  });

  it('skips the log when usage is undefined', () => {
    logClaudeUsage('claudeFileConversion', undefined);
    expect(infoSpy).not.toHaveBeenCalled();
  });
});
