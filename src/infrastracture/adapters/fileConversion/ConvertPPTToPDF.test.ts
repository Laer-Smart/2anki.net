import { EventEmitter } from 'node:events';
import * as childProcess from 'node:child_process';
import { convertPPTToPDF } from './ConvertPPTToPDF';
import Workspace from '../../../lib/parser/WorkSpace';

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  spawn: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('pdf-bytes')),
}));

const mockedSpawn = childProcess.spawn as jest.MockedFunction<
  typeof childProcess.spawn
>;

function makeFailingProcess(
  stderr: string,
  exitCode: number
): childProcess.ChildProcess {
  const proc = new EventEmitter() as childProcess.ChildProcess;
  const stdoutEmitter = new EventEmitter();
  const stderrEmitter = new EventEmitter();
  (
    proc as unknown as { stdout: EventEmitter; stderr: EventEmitter }
  ).stdout = stdoutEmitter;
  (
    proc as unknown as { stdout: EventEmitter; stderr: EventEmitter }
  ).stderr = stderrEmitter;

  setImmediate(() => {
    stderrEmitter.emit('data', Buffer.from(stderr));
    proc.emit('close', exitCode);
  });

  return proc;
}

describe('convertPPTToPDF', () => {
  const workspace = { location: '/tmp/test-ws' } as Workspace;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('surfaces the subprocess stderr and exit code on failure', async () => {
    const stderr =
      'unoconv: Cannot connect to a running LibreOffice instance.';
    mockedSpawn.mockReturnValue(makeFailingProcess(stderr, 251));

    const result = await convertPPTToPDF(
      'slides.pptx',
      Buffer.from('fake'),
      workspace
    ).then(
      () => ({ rejected: false, message: '' }),
      (err: Error) => ({ rejected: true, message: err.message })
    );

    expect(result.rejected).toBe(true);
    expect(result.message).toContain('251');
    expect(result.message).toContain(stderr);
  });

  it('logs the subprocess stderr to the server console on failure', async () => {
    const stderr = 'unoconv: Document export failed.';
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockedSpawn.mockReturnValue(makeFailingProcess(stderr, 251));

    await convertPPTToPDF('slides.pptx', Buffer.from('fake'), workspace).catch(
      () => undefined
    );

    const logged = errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logged).toContain(stderr);
    expect(logged).toContain('251');

    errorSpy.mockRestore();
  });
});
