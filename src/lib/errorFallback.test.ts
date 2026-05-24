import fs from 'fs';
import os from 'os';
import path from 'path';
import { writeFallbackError, drainFallbackFile } from './errorFallback';
import { IErrorEventRepository, ErrorEventInsert } from '../data_layer/ErrorEventRepository';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'errfallback-'));
}

function makeRepository(): IErrorEventRepository & { inserts: ErrorEventInsert[] } {
  const inserts: ErrorEventInsert[] = [];
  return {
    inserts,
    async insert(row: ErrorEventInsert) {
      inserts.push(row);
    },
    async existsWithinWindow() {
      return false;
    },
    async listGroups() {
      return [];
    },
    async countGroups() {
      return 0;
    },
  };
}

describe('writeFallbackError', () => {
  it('creates the logs directory if missing and writes a valid JSON line', () => {
    const tmpDir = makeTempDir();
    const logsDir = path.join(tmpDir, 'logs');

    writeFallbackError(
      { source: 'server', message: 'boom', capturedAt: '2026-05-24T10:00:00.000Z', phase: 'uncaught' },
      logsDir
    );

    expect(fs.existsSync(logsDir)).toBe(true);
    const content = fs.readFileSync(path.join(logsDir, 'error-fallback.jsonl'), 'utf8');
    const line = JSON.parse(content.trim());
    expect(line.source).toBe('server');
    expect(line.message).toBe('boom');
    expect(line.phase).toBe('uncaught');
    expect(line.capturedAt).toBe('2026-05-24T10:00:00.000Z');
  });

  it('appends multiple lines without overwriting', () => {
    const tmpDir = makeTempDir();
    const logsDir = path.join(tmpDir, 'logs');

    writeFallbackError({ source: 'server', message: 'first', capturedAt: 'a', phase: 'uncaught' }, logsDir);
    writeFallbackError({ source: 'server', message: 'second', capturedAt: 'b', phase: 'startup' }, logsDir);

    const content = fs.readFileSync(path.join(logsDir, 'error-fallback.jsonl'), 'utf8');
    const lines = content.trim().split('\n').map((l) => JSON.parse(l));
    expect(lines).toHaveLength(2);
    expect(lines[0].message).toBe('first');
    expect(lines[1].message).toBe('second');
  });

  it('never throws even when given an unwritable directory', () => {
    expect(() => {
      writeFallbackError(
        { source: 'server', message: 'crash', capturedAt: 'now', phase: 'db-outage' },
        '/root/no-permission-dir/logs'
      );
    }).not.toThrow();
  });

  it('includes optional stack and release fields when provided', () => {
    const tmpDir = makeTempDir();
    const logsDir = path.join(tmpDir, 'logs');

    writeFallbackError(
      { source: 'server', message: 'err', stack: 'at foo', release: 'v1.2.3', capturedAt: 'ts', phase: 'unhandled-rejection' },
      logsDir
    );

    const content = fs.readFileSync(path.join(logsDir, 'error-fallback.jsonl'), 'utf8');
    const line = JSON.parse(content.trim());
    expect(line.stack).toBe('at foo');
    expect(line.release).toBe('v1.2.3');
  });
});

describe('drainFallbackFile', () => {
  it('inserts each valid JSON line and returns the count', async () => {
    const tmpDir = makeTempDir();
    const logsDir = path.join(tmpDir, 'logs');
    fs.mkdirSync(logsDir);
    const filePath = path.join(logsDir, 'error-fallback.jsonl');
    fs.writeFileSync(
      filePath,
      [
        JSON.stringify({ source: 'server', message: 'a', capturedAt: '2026-01-01T00:00:00.000Z', phase: 'startup' }),
        JSON.stringify({ source: 'server', message: 'b', capturedAt: '2026-01-02T00:00:00.000Z', phase: 'uncaught' }),
      ].join('\n') + '\n'
    );

    const repo = makeRepository();
    const count = await drainFallbackFile(repo, logsDir);

    expect(count).toBe(2);
    expect(repo.inserts).toHaveLength(2);
    expect(repo.inserts[0].message).toBe('a');
    expect(repo.inserts[1].message).toBe('b');
  });

  it('truncates the file on success', async () => {
    const tmpDir = makeTempDir();
    const logsDir = path.join(tmpDir, 'logs');
    fs.mkdirSync(logsDir);
    const filePath = path.join(logsDir, 'error-fallback.jsonl');
    fs.writeFileSync(filePath, JSON.stringify({ source: 'server', message: 'x', capturedAt: 'ts', phase: 'startup' }) + '\n');

    const repo = makeRepository();
    await drainFallbackFile(repo, logsDir);

    expect(fs.readFileSync(filePath, 'utf8')).toBe('');
  });

  it('skips malformed lines and still inserts the valid ones', async () => {
    const tmpDir = makeTempDir();
    const logsDir = path.join(tmpDir, 'logs');
    fs.mkdirSync(logsDir);
    const filePath = path.join(logsDir, 'error-fallback.jsonl');
    fs.writeFileSync(
      filePath,
      [
        'not-json',
        JSON.stringify({ source: 'server', message: 'valid', capturedAt: 'ts', phase: 'uncaught' }),
        '{broken',
      ].join('\n') + '\n'
    );

    const repo = makeRepository();
    const count = await drainFallbackFile(repo, logsDir);

    expect(count).toBe(1);
    expect(repo.inserts[0].message).toBe('valid');
  });

  it('returns 0 when the file does not exist', async () => {
    const tmpDir = makeTempDir();
    const logsDir = path.join(tmpDir, 'logs');

    const repo = makeRepository();
    const count = await drainFallbackFile(repo, logsDir);

    expect(count).toBe(0);
    expect(repo.inserts).toHaveLength(0);
  });

  it('returns 0 when the file is empty', async () => {
    const tmpDir = makeTempDir();
    const logsDir = path.join(tmpDir, 'logs');
    fs.mkdirSync(logsDir);
    fs.writeFileSync(path.join(logsDir, 'error-fallback.jsonl'), '');

    const repo = makeRepository();
    const count = await drainFallbackFile(repo, logsDir);

    expect(count).toBe(0);
  });
});
