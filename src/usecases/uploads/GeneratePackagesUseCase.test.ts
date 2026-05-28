import { EventEmitter } from 'events';

jest.mock('worker_threads', () => ({
  Worker: jest.fn(),
  workerData: null,
  parentPort: null,
  isMainThread: true,
}));

jest.mock('node:fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
}));

jest.mock('../../lib/parser/WorkSpace');

import GeneratePackagesUseCase from './GeneratePackagesUseCase';
import { Worker } from 'worker_threads';
import CardOption from '../../lib/parser/Settings/CardOption';
import Workspace from '../../lib/parser/WorkSpace';
import { UploadedFile } from '../../lib/storage/types';
import { EmptyDeckError } from '../jobs/EmptyDeckError';

const MockWorker = Worker as jest.MockedClass<typeof Worker>;

function makeWorkerEmitter(): EventEmitter {
  const emitter = new EventEmitter();
  MockWorker.mockImplementation(() => emitter as never);
  return emitter;
}

function makeSettings(): CardOption {
  return new CardOption({});
}

function makeWorkspace(): Workspace {
  return {} as Workspace;
}

function makeFile(name: string): UploadedFile {
  return {
    fieldname: 'file',
    originalname: name,
    encoding: '7bit',
    mimetype: 'text/plain',
    size: 0,
    stream: null as never,
    destination: '',
    filename: name,
    path: '',
    buffer: undefined as never,
    key: 'test-key',
  };
}

describe('GeneratePackagesUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves with packages and warnings when the worker sends a result message', async () => {
    const emitter = makeWorkerEmitter();
    const useCase = new GeneratePackagesUseCase();

    const promise = useCase.execute(
      false,
      [makeFile('notes.html')],
      makeSettings(),
      makeWorkspace()
    );

    emitter.emit('message', {
      type: 'result',
      packages: [{ name: 'notes.apkg', cardCount: 5, mcqCount: 0, mcqSkippedCount: 0 }],
      warnings: [],
    });

    const result = await promise;
    expect(result.packages).toHaveLength(1);
    expect(result.packages[0].name).toBe('notes.apkg');
    expect(result.warnings).toEqual([]);
  });

  it('resolves with an empty packages array when the worker sends a result with undefined packages', async () => {
    const emitter = makeWorkerEmitter();
    const useCase = new GeneratePackagesUseCase();

    const promise = useCase.execute(
      false,
      [makeFile('empty.html')],
      makeSettings(),
      makeWorkspace()
    );

    emitter.emit('message', { type: 'result', packages: undefined, warnings: undefined });

    const result = await promise;
    expect(result.packages).toEqual([]);
  });

  it('rejects when the worker sends an error message', async () => {
    const emitter = makeWorkerEmitter();
    const useCase = new GeneratePackagesUseCase();

    const promise = useCase.execute(
      false,
      [makeFile('bad.html')],
      makeSettings(),
      makeWorkspace()
    );

    emitter.emit('message', {
      type: 'error',
      message: "Cannot read properties of undefined (reading 'name')",
    });

    await expect(promise).rejects.toThrow("Cannot read properties of undefined (reading 'name')");
  });

  it('rejects when the worker emits an error event', async () => {
    const emitter = makeWorkerEmitter();
    const useCase = new GeneratePackagesUseCase();

    const promise = useCase.execute(
      false,
      [makeFile('crash.html')],
      makeSettings(),
      makeWorkspace()
    );

    emitter.emit('error', new Error('Worker crashed'));

    await expect(promise).rejects.toThrow('Worker crashed');
  });

  it('rejects with EmptyDeckError when the worker sends an error message with name EmptyDeckError', async () => {
    const emitter = makeWorkerEmitter();
    const useCase = new GeneratePackagesUseCase();

    const promise = useCase.execute(
      false,
      [makeFile('empty.html')],
      makeSettings(),
      makeWorkspace()
    );

    emitter.emit('message', {
      type: 'error',
      message: 'No cards found in your upload. Use .zip, .html, .md, or .csv.',
      name: 'EmptyDeckError',
    });

    await expect(promise).rejects.toBeInstanceOf(EmptyDeckError);
  });

  it('preserves error name on the rejected Error for non-EmptyDeckError named errors', async () => {
    const emitter = makeWorkerEmitter();
    const useCase = new GeneratePackagesUseCase();

    const promise = useCase.execute(
      false,
      [makeFile('other.html')],
      makeSettings(),
      makeWorkspace()
    );

    emitter.emit('message', {
      type: 'error',
      message: 'some message',
      name: 'CustomError',
    });

    const err = await promise.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).name).toBe('CustomError');
  });
});
